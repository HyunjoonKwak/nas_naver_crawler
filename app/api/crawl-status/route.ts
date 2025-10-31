import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CRAWL_STATUS');

export const dynamic = 'force-dynamic';

export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 인증 및 사용자 필터링
  const currentUser = await requireAuth();
  const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

  const { searchParams } = new URL(request.url);
  const crawlId = searchParams.get('crawlId');

  if (crawlId) {
    // 특정 크롤링 작업의 상태 조회 (사용자 필터링 적용)
    const crawlHistory = await prisma.crawlHistory.findFirst({
      where: {
        id: crawlId,
        userId: { in: accessibleUserIds }, // 사용자 권한 확인
      },
    });

    if (!crawlHistory) {
      throw new ApiError(ErrorType.NOT_FOUND, '크롤링 작업을 찾을 수 없습니다.', 404);
    }

    // 진행률 계산
    const progress = {
      currentStep: crawlHistory.currentStep || 'Unknown',
      processedComplexes: crawlHistory.processedComplexes,
      totalComplexes: crawlHistory.totalComplexes,
      processedArticles: crawlHistory.processedArticles,
      totalArticles: crawlHistory.totalArticles,
      complexProgress: crawlHistory.totalComplexes > 0
        ? Math.round((crawlHistory.processedComplexes / crawlHistory.totalComplexes) * 100)
        : 0,
    };

    logger.info('Crawl status fetched', { crawlId, status: crawlHistory.status, userId: currentUser.id });

    return ApiResponseHelper.success({
      crawlId: crawlHistory.id,
      status: crawlHistory.status,
      progress,
      duration: crawlHistory.duration,
      errorMessage: crawlHistory.errorMessage,
      createdAt: crawlHistory.createdAt,
      updatedAt: crawlHistory.updatedAt,
    });
  } else {
    // 가장 최근 크롤링 작업 조회
    const latestCrawl = await prisma.crawlHistory.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latestCrawl) {
      logger.info('No crawl history found');
      return ApiResponseHelper.success({
        found: false,
        message: '크롤링 기록이 없습니다.',
      });
    }

    // 진행률 계산
    const progress = {
      currentStep: latestCrawl.currentStep || 'Unknown',
      processedComplexes: latestCrawl.processedComplexes,
      totalComplexes: latestCrawl.totalComplexes,
      processedArticles: latestCrawl.processedArticles,
      totalArticles: latestCrawl.totalArticles,
      complexProgress: latestCrawl.totalComplexes > 0
        ? Math.round((latestCrawl.processedComplexes / latestCrawl.totalComplexes) * 100)
        : 0,
    };

    logger.info('Latest crawl status fetched', { crawlId: latestCrawl.id, status: latestCrawl.status });

    return ApiResponseHelper.success({
      found: true,
      crawlId: latestCrawl.id,
      status: latestCrawl.status,
      progress,
      duration: latestCrawl.duration,
      errorMessage: latestCrawl.errorMessage,
      createdAt: latestCrawl.createdAt,
      updatedAt: latestCrawl.updatedAt,
    });
  }
});
