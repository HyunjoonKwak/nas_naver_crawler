import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 병렬로 모든 통계 조회
    const [
      totalComplexes,
      totalArticles,
      favoriteComplexes,
      crawlHistoryCount,
      completedCrawls,
      failedCrawls,
      recentComplexes,
      recentArticles,
      tradeTypeStats,
    ] = await Promise.all([
      // 전체 단지 수
      prisma.complex.count(),

      // 전체 매물 수
      prisma.article.count(),

      // 관심 단지 수 (Favorite 테이블 기반)
      prisma.favorite.count(),

      // 전체 크롤링 기록 수
      prisma.crawlHistory.count(),

      // 완료된 크롤링 수
      prisma.crawlHistory.count({
        where: { status: 'completed' },
      }),

      // 실패한 크롤링 수
      prisma.crawlHistory.count({
        where: { status: 'failed' },
      }),

      // 최근 7일 간 추가된 단지 수
      prisma.complex.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // 최근 7일 간 추가된 매물 수
      prisma.article.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // 거래 유형별 매물 통계
      prisma.article.groupBy({
        by: ['tradeTypeName'],
        _count: {
          tradeTypeName: true,
        },
      }),
    ]);

    // 최근 크롤링 기록 (최근 5개)
    const recentCrawls = await prisma.crawlHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        totalComplexes: true,
        processedComplexes: true,
        totalArticles: true,
        processedArticles: true,
        duration: true,
        createdAt: true,
      },
    });

    // 평균 크롤링 소요 시간
    const crawlsWithDuration = await prisma.crawlHistory.findMany({
      where: {
        status: 'completed',
        duration: { not: null },
      },
      select: {
        duration: true,
      },
    });

    const avgDuration = crawlsWithDuration.length > 0
      ? Math.round(
          crawlsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) / crawlsWithDuration.length
        )
      : 0;

    // 거래 유형별 통계를 객체로 변환
    const tradeTypeStatsMap = tradeTypeStats.reduce((acc, stat) => {
      acc[stat.tradeTypeName || '기타'] = stat._count.tradeTypeName;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      database: {
        totalComplexes,
        totalArticles,
        favoriteComplexes,
        recentComplexes,
        recentArticles,
      },
      crawling: {
        totalCrawls: crawlHistoryCount,
        completedCrawls,
        failedCrawls,
        avgDuration,
        recentCrawls,
      },
      tradeTypes: tradeTypeStatsMap,
    });
  } catch (error: any) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json(
      {
        error: 'DB 통계 조회 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
