/**
 * 댓글 API
 * GET: 댓글 목록 조회
 * POST: 새 댓글 작성
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimit, rateLimitPresets } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { validateRequest } from '@/lib/validation';
import { createCommentSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const logger = createLogger('COMMENTS');

/**
 * GET /api/posts/[id]/comments - 댓글 목록 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // 댓글 조회
    const comments = await prisma.comment.findMany({
      where: {
        postId,
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
    });

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error: any) {
    logger.error('Failed to fetch comments', { error, postId: params.id });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch comments',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/[id]/comments - 새 댓글 작성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate Limiting: 분당 10회
    const rateLimitResponse = rateLimit(request, rateLimitPresets.comment);
    if (rateLimitResponse) return rateLimitResponse;

    const currentUser = await requireAuth();
    const { id: postId } = params;

    // Zod 스키마 검증
    const validation = await validateRequest(request, createCommentSchema);
    if (!validation.success) return validation.response;

    const { content, parentId } = validation.data;

    // 게시글 존재 확인
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
      },
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

    // 댓글 생성 및 알림 생성을 트랜잭션으로 처리
    const comment = await prisma.$transaction(async (tx) => {
      // 대댓글인 경우 부모 댓글 확인
      if (parentId) {
        const parentComment = await tx.comment.findUnique({
          where: { id: parentId },
        });
        if (!parentComment || parentComment.postId !== postId) {
          throw new Error('Invalid parent comment');
        }
      }

      // 댓글 생성
      const newComment = await tx.comment.create({
        data: {
          content,
          postId,
          authorId: currentUser.id,
          parentId: parentId || null,
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
      });

      // 게시글 작성자에게 알림 생성 (본인 댓글 제외)
      if (post.authorId !== currentUser.id) {
        await tx.notification.create({
          data: {
            type: 'COMMENT',
            userId: post.authorId,
            postId,
            commentId: newComment.id,
            message: `${currentUser.name}님이 회원님의 게시글에 댓글을 달았습니다.`,
          },
        });
      }

      return newComment;
    });

    logger.info('Comment created successfully', {
      commentId: comment.id,
      postId: params.id,
      authorId: currentUser.id,
      isReply: !!parentId
    });

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error: any) {
    logger.error('Failed to create comment', {
      error,
      postId: params.id,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create comment',
      },
      { status: 500 }
    );
  }
}
