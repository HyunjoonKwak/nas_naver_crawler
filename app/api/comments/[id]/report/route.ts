/**
 * 댓글 신고 API
 * POST: 댓글 신고
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * POST /api/comments/[id]/report - 댓글 신고
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: commentId } = params;
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

    // 댓글 존재 확인
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment not found',
        },
        { status: 404 }
      );
    }

    // 본인 댓글은 신고 불가
    if (comment.authorId === currentUser.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot report your own comment',
        },
        { status: 400 }
      );
    }

    // 이미 신고했는지 확인
    const existingReport = await prisma.commentReport.findFirst({
      where: {
        commentId,
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
          error: 'You have already reported this comment',
        },
        { status: 400 }
      );
    }

    // 신고 생성
    const report = await prisma.commentReport.create({
      data: {
        commentId,
        reporterId: currentUser.id,
        reason,
        description: description || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Comment reported successfully',
      report,
    });
  } catch (error: any) {
    console.error('Failed to report comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to report comment',
      },
      { status: 500 }
    );
  }
}
