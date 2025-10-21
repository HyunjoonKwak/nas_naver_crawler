/**
 * Q&A 댓글 채택 API
 * POST: 댓글 채택 (질문 작성자만 가능)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/comments/[id]/accept - 댓글 채택
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: commentId } = params;

    // 댓글 및 게시글 정보 조회
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: true,
        author: true,
      },
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

    // Q&A 게시판인지 확인
    if (comment.post.category !== 'QNA') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Q&A posts can have accepted answers',
        },
        { status: 400 }
      );
    }

    // 질문 작성자만 채택 가능
    if (comment.post.authorId !== currentUser.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only the question author can accept an answer',
        },
        { status: 403 }
      );
    }

    // 이미 채택된 댓글이 있는지 확인
    if (comment.post.acceptedCommentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'An answer has already been accepted for this question',
        },
        { status: 400 }
      );
    }

    // 댓글 채택 처리 (트랜잭션)
    const result = await prisma.$transaction(async (tx) => {
      // 댓글 채택 상태 업데이트
      const updatedComment = await tx.comment.update({
        where: { id: commentId },
        data: {
          isAccepted: true,
        },
      });

      // 게시글 해결 상태 및 채택된 댓글 ID 업데이트
      const updatedPost = await tx.post.update({
        where: { id: comment.postId },
        data: {
          isResolved: true,
          acceptedCommentId: commentId,
        },
      });

      // 답변 작성자에게 알림 생성 (본인이 아닌 경우)
      if (comment.authorId !== currentUser.id) {
        await tx.notification.create({
          data: {
            type: 'ACCEPTED',
            userId: comment.authorId,
            postId: comment.postId,
            commentId: commentId,
            message: `${currentUser.name}님이 회원님의 답변을 채택했습니다.`,
          },
        });
      }

      return { comment: updatedComment, post: updatedPost };
    });

    return NextResponse.json({
      success: true,
      message: 'Comment accepted successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Failed to accept comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to accept comment',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/[id]/accept - 댓글 채택 취소
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id: commentId } = params;

    // 댓글 및 게시글 정보 조회
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: true,
      },
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

    // 질문 작성자 또는 관리자만 취소 가능
    if (
      comment.post.authorId !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to cancel this acceptance',
        },
        { status: 403 }
      );
    }

    // 채택된 댓글이 맞는지 확인
    if (!comment.isAccepted || comment.post.acceptedCommentId !== commentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'This comment is not accepted',
        },
        { status: 400 }
      );
    }

    // 채택 취소 처리 (트랜잭션)
    await prisma.$transaction(async (tx) => {
      // 댓글 채택 상태 해제
      await tx.comment.update({
        where: { id: commentId },
        data: {
          isAccepted: false,
        },
      });

      // 게시글 해결 상태 및 채택된 댓글 ID 초기화
      await tx.post.update({
        where: { id: comment.postId },
        data: {
          isResolved: false,
          acceptedCommentId: null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Comment acceptance cancelled successfully',
    });
  } catch (error: any) {
    console.error('Failed to cancel comment acceptance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cancel comment acceptance',
      },
      { status: 500 }
    );
  }
}
