/**
 * 관리자용 신고 관리 API
 * GET: 신고 목록 조회
 * PATCH: 신고 처리 상태 업데이트
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_ADMIN_REPORTS');

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reports - 신고 목록 조회 (관리자 전용)
 */
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();

  // 관리자 권한 확인
  if (currentUser.role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, 'Admin permission required', 403);
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // post or comment
  const status = searchParams.get('status'); // PENDING, IN_REVIEW, RESOLVED, REJECTED
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const skip = (page - 1) * limit;

  // 게시글 신고 조회
  if (!type || type === 'post') {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [postReports, postReportsTotal] = await Promise.all([
      prisma.postReport.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
              content: true,
              category: true,
              authorId: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.postReport.count({ where }),
    ]);

    if (type === 'post') {
      logger.info('Post reports fetched', { count: postReports.length, status, page });
      return ApiResponseHelper.success({
        success: true,
        reports: postReports,
        pagination: {
          page,
          limit,
          total: postReportsTotal,
          totalPages: Math.ceil(postReportsTotal / limit),
        },
      });
    }
  }

  // 댓글 신고 조회
  if (!type || type === 'comment') {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [commentReports, commentReportsTotal] = await Promise.all([
      prisma.commentReport.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          comment: {
            select: {
              id: true,
              content: true,
              postId: true,
              authorId: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: type === 'comment' ? skip : 0,
        take: type === 'comment' ? limit : undefined,
      }),
      prisma.commentReport.count({ where }),
    ]);

    if (type === 'comment') {
      logger.info('Comment reports fetched', { count: commentReports.length, status, page });
      return ApiResponseHelper.success({
        success: true,
        reports: commentReports,
        pagination: {
          page,
          limit,
          total: commentReportsTotal,
          totalPages: Math.ceil(commentReportsTotal / limit),
        },
      });
    }
  }

  // 타입 미지정시 모든 신고 조회 (통계용)
  const [postReportStats, commentReportStats] = await Promise.all([
    prisma.postReport.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.commentReport.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  logger.info('Report statistics fetched', {
    postReportGroups: postReportStats.length,
    commentReportGroups: commentReportStats.length
  });

  return ApiResponseHelper.success({
    success: true,
    stats: {
      postReports: postReportStats,
      commentReports: commentReportStats,
    },
  });
});

/**
 * PATCH /api/admin/reports - 신고 처리 상태 업데이트 (관리자 전용)
 */
export const PATCH = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();

  // 관리자 권한 확인
  if (currentUser.role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, 'Admin permission required', 403);
  }

  const body = await request.json();
  const { reportId, type, status, adminNote } = body;

  // 필수 필드 검증
  if (!reportId || !type || !status) {
    throw new ApiError(ErrorType.VALIDATION, 'Report ID, type, and status are required', 400);
  }

  // 상태 검증
  const validStatuses = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(ErrorType.VALIDATION, 'Invalid status', 400);
  }

  // 신고 처리
  if (type === 'post') {
    const report = await prisma.postReport.update({
      where: { id: reportId },
      data: {
        status,
        adminNote: adminNote || null,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
    });

    logger.info('Post report updated', { reportId, status, adminId: currentUser.id });

    return ApiResponseHelper.success({
      success: true,
      message: 'Post report updated successfully',
      report,
    }, 'Post report updated successfully');
  } else if (type === 'comment') {
    const report = await prisma.commentReport.update({
      where: { id: reportId },
      data: {
        status,
        adminNote: adminNote || null,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
    });

    logger.info('Comment report updated', { reportId, status, adminId: currentUser.id });

    return ApiResponseHelper.success({
      success: true,
      message: 'Comment report updated successfully',
      report,
    }, 'Comment report updated successfully');
  } else {
    throw new ApiError(ErrorType.VALIDATION, 'Invalid report type', 400);
  }
});
