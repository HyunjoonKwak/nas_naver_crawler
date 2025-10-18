/**
 * 게시글 상세 API
 * GET: 게시글 상세 조회
 * PATCH: 게시글 수정
 * DELETE: 게시글 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/posts/[id] - 게시글 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const currentUser = await requireAuth();

    // 조회수 증가 여부 확인 (쿼리 파라미터로 제어)
    const url = new URL(request.url);
    const incrementView = url.searchParams.get('incrementView') === 'true';

    // 게시글 조회
    const post = await prisma.$transaction(async (tx) => {
      // 조회수 증가 (작성자 본인이 아니고, incrementView가 true인 경우만)
      const existingPost = await tx.post.findUnique({
        where: { id },
        select: { authorId: true },
      });

      if (incrementView && existingPost && existingPost.authorId !== currentUser.id) {
        await tx.post.update({
          where: { id },
          data: {
            views: {
              increment: 1,
            },
          },
        });
      }

      // 게시글 상세 조회
      return await tx.post.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          comments: {
            where: {
              isDeleted: false,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          images: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });
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

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error: any) {
    console.error('Failed to fetch post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch post',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/posts/[id] - 게시글 수정
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id } = params;
    const body = await request.json();
    const { title, content, isResolved, isPinned } = body;

    // 게시글 존재 확인 및 권한 체크
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost || existingPost.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    // 작성자 본인 또는 관리자만 수정 가능
    if (
      existingPost.authorId !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to edit this post',
        },
        { status: 403 }
      );
    }

    // 게시글 수정
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    // Q&A 카테고리인 경우만 isResolved 업데이트 가능
    if (isResolved !== undefined && existingPost.category === 'QNA') {
      updateData.isResolved = isResolved;
    }

    // 관리자만 isPinned 업데이트 가능
    if (isPinned !== undefined && currentUser.role === 'ADMIN') {
      updateData.isPinned = isPinned;
    }

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error: any) {
    console.error('Failed to update post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update post',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id] - 게시글 삭제 (Soft Delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id } = params;

    // 게시글 존재 확인 및 권한 체크
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost || existingPost.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    // 작성자 본인 또는 관리자만 삭제 가능
    if (
      existingPost.authorId !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to delete this post',
        },
        { status: 403 }
      );
    }

    // Soft Delete
    await prisma.post.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete post',
      },
      { status: 500 }
    );
  }
}
