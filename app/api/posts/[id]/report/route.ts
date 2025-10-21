/**
 * 게시글 신고 API
 * POST: 게시글 신고
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/posts/[id]/report - 게시글 신고
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: postId } = params;
    const body = await request.json();
    const { reason, description } = body;

    // 필수 필드 검증
    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report reason is required',
        },
        { status: 400 }
      );
    }

    // 신고 사유 검증
    const validReasons = ['SPAM', 'ABUSE', 'INAPPROPRIATE', 'COPYRIGHT', 'ETC'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid report reason',
        },
        { status: 400 }
      );
    }

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

    // 본인 게시글은 신고 불가
    if (post.authorId === currentUser.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot report your own post',
        },
        { status: 400 }
      );
    }

    // 이미 신고했는지 확인
    const existingReport = await prisma.postReport.findFirst({
      where: {
        postId,
        reporterId: currentUser.id,
        status: {
          in: ['PENDING', 'IN_REVIEW'],
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already reported this post',
        },
        { status: 400 }
      );
    }

    // 신고 생성
    const report = await prisma.postReport.create({
      data: {
        postId,
        reporterId: currentUser.id,
        reason,
        description: description || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Post reported successfully',
      report,
    });
  } catch (error: any) {
    console.error('Failed to report post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to report post',
      },
      { status: 500 }
    );
  }
}
