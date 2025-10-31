import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';
import { getCached, cacheTTL } from '@/lib/cache';
import { ApiResponseHelper } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';

const logger = createLogger('DB-STATS');

export const dynamic = 'force-dynamic';

export const GET = ApiResponseHelper.handler(async () => {
  // 인증 확인
  const currentUser = await requireAuth();

  // 사용자가 접근 가능한 userId 목록 가져오기
  const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

  // 사용자 필터 조건
  const userFilter = { userId: { in: accessibleUserIds } };

  // 캐시 키 (사용자별로 다른 캐시)
  const cacheKey = `db-stats:${currentUser.id}`;

  // 캐시된 데이터가 있으면 반환 (1분 캐시)
  const stats = await getCached(cacheKey, cacheTTL.short, async () => {
    logger.debug('Fetching DB stats from database', { userId: currentUser.id });

    // DB에서 즐겨찾기 단지 개수 가져오기
    const favoriteComplexes = await prisma.favorite.count({
      where: userFilter,
    });

    // 병렬로 모든 통계 조회
    const [
      totalComplexes,
      totalArticles,
      crawlHistoryCount,
      completedCrawls,
      failedCrawls,
      recentComplexes,
      recentArticles,
      tradeTypeStats,
    ] = await Promise.all([
      // 전체 단지 수 (사용자 필터링)
      prisma.complex.count({
        where: userFilter,
      }),

      // 전체 매물 수 (사용자의 단지에 속한 매물만)
      prisma.article.count({
        where: {
          complex: userFilter,
        },
      }),

      // 전체 크롤링 기록 수 (사용자 필터링)
      prisma.crawlHistory.count({
        where: userFilter,
      }),

      // 완료된 크롤링 수 (사용자 필터링)
      prisma.crawlHistory.count({
        where: {
          ...userFilter,
          status: {
            in: ['completed', 'success']
          }
        },
      }),

      // 실패한 크롤링 수 (사용자 필터링)
      prisma.crawlHistory.count({
        where: {
          ...userFilter,
          status: 'failed'
        },
      }),

      // 최근 7일 간 추가된 단지 수 (사용자 필터링)
      prisma.complex.count({
        where: {
          ...userFilter,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // 최근 7일 간 추가된 매물 수 (사용자 필터링)
      prisma.article.count({
        where: {
          complex: userFilter,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // 거래 유형별 매물 통계 (사용자 필터링)
      prisma.article.groupBy({
        by: ['tradeTypeName'],
        where: {
          complex: userFilter,
        },
        _count: {
          tradeTypeName: true,
        },
      }),
    ]);

    // 최근 크롤링 기록 (최근 5개, 사용자 필터링)
    const recentCrawls = await prisma.crawlHistory.findMany({
      where: userFilter,
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

    // 평균 크롤링 소요 시간 (duration이 0보다 큰 완료된 크롤링만, 사용자 필터링)
    const crawlsWithDuration = await prisma.crawlHistory.findMany({
      where: {
        ...userFilter,
        status: {
          in: ['completed', 'success']
        },
        duration: {
          gt: 0,
        },
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

    return {
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
    };
  });

  logger.info('DB stats fetched successfully', {
    userId: currentUser.id,
    totalComplexes: stats.database.totalComplexes,
    totalArticles: stats.database.totalArticles
  });

  return NextResponse.json(stats);
});
