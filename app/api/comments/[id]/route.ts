/**
 * 댓글 상세 API
 * PATCH: 댓글 수정
 * DELETE: 댓글 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/comments/[id] - 댓글 수정
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id } = params;
    const body = await request.json();
    const { content } = body;

    // 필수 필드 검증
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment content is required',
        },
        { status: 400 }
      );
    }

    // 댓글 존재 확인 및 권한 체크
    const existingComment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment || existingComment.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment not found',
        },
        { status: 404 }
      );
    }

    // 작성자 본인 또는 관리자만 수정 가능
    if (
      existingComment.authorId !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to edit this comment',
        },
        { status: 403 }
      );
    }

    // 댓글 수정
    const comment = await prisma.comment.update({
      where: { id },
      data: { content },
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
      comment,
    });
  } catch (error: any) {
    console.error('Failed to update comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update comment',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/[id] - 댓글 삭제 (Soft Delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { id } = params;

    // 댓글 존재 확인 및 권한 체크
    const existingComment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment || existingComment.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment not found',
        },
        { status: 404 }
      );
    }

    // 작성자 본인 또는 관리자만 삭제 가능
    if (
      existingComment.authorId !== currentUser.id &&
      currentUser.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to delete this comment',
        },
        { status: 403 }
      );
    }

    // Soft Delete
    await prisma.comment.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete comment',
      },
      { status: 500 }
    );
  }
}
