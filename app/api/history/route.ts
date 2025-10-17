import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// 크롤링 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const currentUser = await requireAuth();

    // 사용자가 접근 가능한 userId 목록 가져오기
    const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const status = searchParams.get('status'); // success, error, partial_success
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // WHERE 조건 구성 (사용자 필터링 추가)
    const where: any = {
      userId: { in: accessibleUserIds }
    };

    if (status) {
      where.status = status;
    }

    // 히스토리 조회
    const histories = await prisma.crawlHistory.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 총 개수
    const total = await prisma.crawlHistory.count({ where });

    // 사용자 필터 조건
    const userFilter = { userId: { in: accessibleUserIds } };

    // 통계 계산 (사용자 필터링 적용)
    const stats = {
      total: await prisma.crawlHistory.count({ where: userFilter }),
      success: await prisma.crawlHistory.count({ where: { ...userFilter, status: 'success' } }),
      error: await prisma.crawlHistory.count({ where: { ...userFilter, status: 'error' } }),
      partialSuccess: await prisma.crawlHistory.count({ where: { ...userFilter, status: 'partial_success' } }),
      totalArticles: await prisma.crawlHistory.aggregate({
        where: userFilter,
        _sum: { totalArticles: true },
      }),
      avgDuration: await prisma.crawlHistory.aggregate({
        where: userFilter,
        _avg: { duration: true },
      }),
    };

    return NextResponse.json({
      histories: histories.map(h => ({
        id: h.id,
        complexNos: h.complexNos,
        totalComplexes: h.totalComplexes,
        successCount: h.successCount,
        errorCount: h.errorCount,
        totalArticles: h.totalArticles,
        duration: h.duration,
        status: h.status,
        errorMessage: h.errorMessage,
        createdAt: h.createdAt.toISOString(),
      })),
      stats: {
        total: stats.total,
        success: stats.success,
        error: stats.error,
        partialSuccess: stats.partialSuccess,
        totalArticlesCrawled: stats.totalArticles._sum.totalArticles || 0,
        avgDuration: Math.round(stats.avgDuration._avg.duration || 0),
      },
      total,
      limit,
      offset,
    });

  } catch (error: any) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: '히스토리 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// 특정 히스토리 상세 조회
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const currentUser = await requireAuth();
    const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 히스토리 조회 (사용자 필터링)
    const history = await prisma.crawlHistory.findFirst({
      where: {
        id,
        userId: { in: accessibleUserIds }
      },
    });

    if (!history) {
      return NextResponse.json(
        { error: '히스토리를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 해당 히스토리의 단지 정보 조회
    const complexes = await prisma.complex.findMany({
      where: {
        complexNo: {
          in: history.complexNos,
        },
      },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    return NextResponse.json({
      history: {
        id: history.id,
        complexNos: history.complexNos,
        totalComplexes: history.totalComplexes,
        successCount: history.successCount,
        errorCount: history.errorCount,
        totalArticles: history.totalArticles,
        duration: history.duration,
        status: history.status,
        errorMessage: history.errorMessage,
        createdAt: history.createdAt.toISOString(),
      },
      complexes: complexes.map(c => ({
        complexNo: c.complexNo,
        complexName: c.complexName,
        articleCount: c._count.articles,
      })),
    });

  } catch (error: any) {
    console.error('History detail fetch error:', error);
    return NextResponse.json(
      { error: '히스토리 상세 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// 히스토리 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const currentUser = await requireAuth();
    const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 본인 또는 접근 가능한 사용자의 히스토리만 삭제 가능
    const deleted = await prisma.crawlHistory.deleteMany({
      where: {
        id,
        userId: { in: accessibleUserIds }
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: '히스토리를 찾을 수 없거나 삭제 권한이 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '히스토리가 삭제되었습니다.',
      id,
    });

  } catch (error: any) {
    console.error('History delete error:', error);
    return NextResponse.json(
      { error: '히스토리 삭제 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
