/**
 * 관리자용 신고 관리 API
 * GET: 신고 목록 조회
 * PATCH: 신고 처리 상태 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reports - 신고 목록 조회 (관리자 전용)
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // 관리자 권한 확인
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin permission required',
        },
        { status: 403 }
      );
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
        return NextResponse.json({
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
        return NextResponse.json({
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

    return NextResponse.json({
      success: true,
      stats: {
        postReports: postReportStats,
        commentReports: commentReportStats,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch reports',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/reports - 신고 처리 상태 업데이트 (관리자 전용)
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // 관리자 권한 확인
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin permission required',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reportId, type, status, adminNote } = body;

    // 필수 필드 검증
    if (!reportId || !type || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report ID, type, and status are required',
        },
        { status: 400 }
      );
    }

    // 상태 검증
    const validStatuses = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status',
        },
        { status: 400 }
      );
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

      return NextResponse.json({
        success: true,
        message: 'Post report updated successfully',
        report,
      });
    } else if (type === 'comment') {
      const report = await prisma.commentReport.update({
        where: { id: reportId },
        data: {
          status,
          adminNote: adminNote || null,
          resolvedAt: status === 'RESOLVED' ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Comment report updated successfully',
        report,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid report type',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Failed to update report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update report',
      },
      { status: 500 }
    );
  }
}
