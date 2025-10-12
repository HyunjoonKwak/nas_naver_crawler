import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 크롤링 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const status = searchParams.get('status'); // success, error, partial_success
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // WHERE 조건 구성
    const where: any = {};

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

    // 통계 계산
    const stats = {
      total: await prisma.crawlHistory.count(),
      success: await prisma.crawlHistory.count({ where: { status: 'success' } }),
      error: await prisma.crawlHistory.count({ where: { status: 'error' } }),
      partialSuccess: await prisma.crawlHistory.count({ where: { status: 'partial_success' } }),
      totalArticles: await prisma.crawlHistory.aggregate({
        _sum: { totalArticles: true },
      }),
      avgDuration: await prisma.crawlHistory.aggregate({
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
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 히스토리 조회
    const history = await prisma.crawlHistory.findUnique({
      where: { id },
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id가 필요합니다.' },
        { status: 400 }
      );
    }

    await prisma.crawlHistory.delete({
      where: { id },
    });

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
