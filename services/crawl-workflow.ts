/**
 * 크롤링 워크플로우 오케스트레이션 서비스
 *
 * 책임:
 * - 전체 크롤링 프로세스 조율
 * - Python 크롤러 실행 → DB 저장 → 알림 발송
 * - 히스토리 관리 및 캐시 무효화
 * - 스케줄 정보 업데이트
 */

import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { deleteCache } from '@/lib/redis-cache';
import { eventBroadcaster } from '@/lib/eventBroadcaster';
import { calculateDynamicTimeout } from '@/lib/timeoutCalculator';
import { executePythonCrawler } from './crawler-executor';
import { saveCrawlResultsToDB } from './crawl-db-service';
import { sendAlertsForChanges } from './alert-service';
import { CrawlExecutionOptions, CrawlStatus } from './types';

const logger = createLogger('CRAWL_WORKFLOW');

export interface CrawlWorkflowResult {
  success: boolean;
  crawlId: string;
  totalComplexes: number;
  totalArticles: number;
  duration: number;
  status: CrawlStatus;
  errors: string[];
}

/**
 * 기본 디렉토리 경로를 반환합니다.
 */
function getBaseDir(): string {
  return process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
}

/**
 * 크롤링 히스토리를 생성합니다.
 */
async function createCrawlHistory(
  crawlId: string,
  complexNos: string[],
  userId: string,
  scheduleId: string | null
): Promise<void> {
  await prisma.crawlHistory.create({
    data: {
      id: crawlId,
      complexNos: complexNos,
      status: 'pending',
      currentStep: 'Initializing',
      userId,
      scheduleId,
    },
  });

  logger.info('Crawl history created', {
    crawlId,
    complexCount: complexNos.length,
    scheduleId,
  });
}

/**
 * 크롤링 히스토리를 업데이트합니다.
 */
async function updateCrawlHistory(
  crawlId: string,
  data: Partial<{
    successCount: number;
    errorCount: number;
    totalArticles: number;
    duration: number;
    status: CrawlStatus;
    errorMessage: string | null;
    currentStep: string;
  }>
): Promise<void> {
  await prisma.crawlHistory.update({
    where: { id: crawlId },
    data,
  });
}

/**
 * 스케줄 정보를 업데이트합니다.
 */
async function updateScheduleInfo(
  scheduleId: string,
  status: 'success' | 'failed',
  duration: number,
  articlesCount: number,
  errorMessage: string | null
): Promise<void> {
  try {
    // 스케줄 lastRun 업데이트
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { lastRun: new Date() },
    });

    // 스케줄 로그 저장
    await prisma.scheduleLog.create({
      data: {
        scheduleId,
        status,
        duration: Math.floor(duration / 1000), // 초 단위
        articlesCount,
        errorMessage,
      },
    });

    logger.info('Schedule info updated', {
      scheduleId,
      status,
      duration,
    });
  } catch (error: any) {
    logger.error('Failed to update schedule info', {
      scheduleId,
      error: error.message,
    });
  }
}

/**
 * 캐시를 무효화합니다.
 */
async function invalidateCrawlCaches(): Promise<void> {
  try {
    await deleteCache('complex:*');
    await deleteCache('analytics:*');
    await deleteCache('article:*');

    logger.info('Crawl caches invalidated');
  } catch (error: any) {
    logger.warn('Failed to invalidate caches', {
      error: error.message,
    });
  }
}

/**
 * 크롤링 에러를 처리합니다.
 */
async function handleCrawlError(
  crawlId: string,
  scheduleId: string | null,
  error: Error,
  duration: number
): Promise<void> {
  logger.error('Crawl workflow error', {
    crawlId,
    error: error.message,
    stack: error.stack,
  });

  // 히스토리 업데이트
  await updateCrawlHistory(crawlId, {
    duration: Math.floor(duration / 1000),
    status: 'failed',
    errorMessage: error.message,
    currentStep: 'Failed',
  }).catch(err => {
    logger.error('Failed to update error history', {
      crawlId,
      error: err.message,
    });
  });

  // 스케줄 정보 업데이트
  if (scheduleId) {
    await updateScheduleInfo(
      scheduleId,
      'failed',
      duration,
      0,
      error.message
    );
  }

  // 실패 이벤트 브로드캐스트
  eventBroadcaster.notifyCrawlFailed(crawlId, error.message);
}

/**
 * 전체 크롤링 워크플로우를 실행합니다.
 *
 * @param options - 크롤링 실행 옵션
 * @returns 크롤링 결과
 */
export async function executeCrawlWorkflow(
  options: CrawlExecutionOptions
): Promise<CrawlWorkflowResult> {
  const { crawlId, complexNos, userId, scheduleId } = options;
  const startTime = Date.now();
  const baseDir = getBaseDir();

  try {
    logger.info('Starting crawl workflow', {
      crawlId,
      complexCount: complexNos.length,
      scheduleId,
    });

    // 1. 히스토리 생성
    await createCrawlHistory(crawlId, complexNos, userId, scheduleId || null);

    // 2. 타임아웃 계산
    const timeout = calculateDynamicTimeout(complexNos.length);

    // 3. Python 크롤러 실행
    await updateCrawlHistory(crawlId, {
      status: 'crawling',
      currentStep: 'Running Python crawler',
    });

    const crawlResult = await executePythonCrawler({
      crawlId,
      complexNos: complexNos.join(','),
      baseDir,
      timeout,
    });

    if (!crawlResult.success) {
      throw new Error(crawlResult.error || 'Crawler execution failed');
    }

    await updateCrawlHistory(crawlId, {
      currentStep: 'Crawling completed',
    });

    // 4. DB 저장
    logger.info('Saving results to database', { crawlId });

    const dbResult = await saveCrawlResultsToDB({
      crawlId,
      complexNos,
      userId,
      baseDir,
    });

    const duration = Date.now() - startTime;
    const status: CrawlStatus =
      dbResult.errors.length > 0 ? 'partial' : 'success';

    // 5. 히스토리 최종 업데이트
    await updateCrawlHistory(crawlId, {
      successCount: dbResult.totalComplexes,
      errorCount: complexNos.length - dbResult.totalComplexes,
      totalArticles: dbResult.totalArticles,
      duration: Math.floor(duration / 1000),
      status,
      errorMessage:
        dbResult.errors.length > 0 ? dbResult.errors.join(', ') : null,
      currentStep: 'Completed',
    });

    // 6. 스케줄 정보 업데이트
    if (scheduleId) {
      await updateScheduleInfo(
        scheduleId,
        status === 'success' ? 'success' : 'failed',
        duration,
        dbResult.totalArticles,
        dbResult.errors.length > 0 ? dbResult.errors.slice(0, 3).join(', ') : null
      );
    }

    // 7. 완료 이벤트 브로드캐스트
    eventBroadcaster.notifyCrawlComplete(crawlId, dbResult.totalArticles);

    // 8. 캐시 무효화
    await invalidateCrawlCaches();

    // 9. 알림 발송
    await sendAlertsForChanges(complexNos).catch(error => {
      logger.error('Failed to send alerts', {
        crawlId,
        error: error.message,
      });
    });

    logger.info('Crawl workflow completed successfully', {
      crawlId,
      totalComplexes: dbResult.totalComplexes,
      totalArticles: dbResult.totalArticles,
      duration,
      status,
    });

    return {
      success: true,
      crawlId,
      totalComplexes: dbResult.totalComplexes,
      totalArticles: dbResult.totalArticles,
      duration,
      status,
      errors: dbResult.errors,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    await handleCrawlError(crawlId, scheduleId || null, error, duration);

    return {
      success: false,
      crawlId,
      totalComplexes: 0,
      totalArticles: 0,
      duration,
      status: 'failed',
      errors: [error.message],
    };
  }
}
