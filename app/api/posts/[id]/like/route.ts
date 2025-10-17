/**
 * 게시글 좋아요 API
 * POST: 좋아요 추가
 * DELETE: 좋아요 취소
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * POST /api/posts/[id]/like - 좋아요 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: postId } = params;

    // 게시글 존재 확인
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    // 이미 좋아요를 눌렀는지 확인
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already liked this post',
        },
        { status: 400 }
      );
    }

    // 좋아요 추가 및 카운트 증가 (트랜잭션)
    await prisma.$transaction(async (tx) => {
      // 좋아요 추가
      await tx.postLike.create({
        data: {
          postId,
          userId: currentUser.id,
        },
      });

      // 게시글 좋아요 카운트 증가
      await tx.post.update({
        where: { id: postId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Post liked successfully',
    });
  } catch (error: any) {
    console.error('Failed to like post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to like post',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/like - 좋아요 취소
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: postId } = params;

    // 게시글 존재 확인
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    // 좋아요를 눌렀는지 확인
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    if (!existingLike) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have not liked this post',
        },
        { status: 400 }
      );
    }

    // 좋아요 삭제 및 카운트 감소 (트랜잭션)
    await prisma.$transaction(async (tx) => {
      // 좋아요 삭제
      await tx.postLike.delete({
        where: {
          postId_userId: {
            postId,
            userId: currentUser.id,
          },
        },
      });

      // 게시글 좋아요 카운트 감소
      await tx.post.update({
        where: { id: postId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Post unliked successfully',
    });
  } catch (error: any) {
    console.error('Failed to unlike post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to unlike post',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts/[id]/like - 좋아요 상태 확인
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: postId } = params;

    // 좋아요 상태 확인
    const like = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      isLiked: !!like,
    });
  } catch (error: any) {
    console.error('Failed to check like status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check like status',
      },
      { status: 500 }
    );
  }
}
