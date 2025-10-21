/**
 * 게시글 북마크 API
 * POST: 북마크 추가
 * DELETE: 북마크 제거
 * GET: 북마크 상태 확인
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/posts/[id]/bookmark - 북마크 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: postId } = params;

    // 이미 북마크했는지 확인
    const existing = await prisma.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Already bookmarked',
        },
        { status: 400 }
      );
    }

    // 북마크 추가
    await prisma.postBookmark.create({
      data: {
        postId,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bookmark added',
    });
  } catch (error: any) {
    console.error('Failed to bookmark post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to bookmark post',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/bookmark - 북마크 제거
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: postId } = params;

    await prisma.postBookmark.deleteMany({
      where: {
        postId,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bookmark removed',
    });
  } catch (error: any) {
    console.error('Failed to remove bookmark:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove bookmark',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts/[id]/bookmark - 북마크 상태 확인
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: postId } = params;

    const bookmark = await prisma.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      isBookmarked: !!bookmark,
    });
  } catch (error: any) {
    console.error('Failed to check bookmark:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check bookmark',
      },
      { status: 500 }
    );
  }
}
