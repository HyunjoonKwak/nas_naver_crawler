/**
 * 크롤링 DB 저장 서비스 (오케스트레이션)
 *
 * 책임:
 * - 전체 DB 저장 프로세스 조율
 * - 파일 읽기 → 단지 처리 → 매물 처리 → DB 저장
 * - 진행 상황 업데이트
 */

import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { CrawlDbResult } from './types';
import { loadLatestCrawlData } from './crawl-file-reader';
import {
  prepareComplexUpsertData,
  mergeExistingGeoData,
  enrichWithGeocode,
  upsertComplexes,
} from './complex-processor';
import {
  prepareArticleCreateData,
  deduplicateArticles,
  calculateArticleStats,
} from './article-processor';

const logger = createLogger('CRAWL_DB_SERVICE');

export interface SaveCrawlOptions {
  crawlId: string;
  complexNos: string[];
  userId: string;
  baseDir: string;
}

/**
 * 크롤링 히스토리의 currentStep을 업데이트합니다.
 */
async function updateCrawlStep(crawlId: string, step: string): Promise<void> {
  try {
    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: { currentStep: step },
    });
  } catch (error: any) {
    logger.warn('Failed to update crawl step', {
      crawlId,
      step,
      error: error.message,
    });
  }
}

/**
 * 크롤링 결과를 DB에 저장합니다.
 *
 * @param options - 저장 옵션
 * @returns 저장 결과
 */
export async function saveCrawlResultsToDB(
  options: SaveCrawlOptions
): Promise<CrawlDbResult> {
  const { crawlId, complexNos, userId, baseDir } = options;

  let totalArticles = 0;
  let totalComplexes = 0;
  const errors: string[] = [];

  try {
    logger.info('Starting crawl DB save', {
      crawlId,
      complexCount: complexNos.length,
    });

    // 1. 상태 업데이트: DB 저장 시작
    await updateCrawlStep(crawlId, 'Saving to database');

    // 2. 파일 읽기 및 유효성 검증
    await updateCrawlStep(crawlId, 'Reading crawl result files');

    const { data: crawlData, errors: fileErrors } = await loadLatestCrawlData(
      baseDir
    );

    if (fileErrors.length > 0) {
      errors.push(...fileErrors);
    }

    if (crawlData.length === 0) {
      logger.warn('No valid crawl data found');
      return {
        totalArticles: 0,
        totalComplexes: 0,
        errors: ['No valid data found'],
      };
    }

    await updateCrawlStep(crawlId, `Processing ${crawlData.length} complexes`);

    // 3. 단지 정보 처리
    logger.info('Processing complex data');
    const complexes = prepareComplexUpsertData(crawlData, userId);

    // 4. 역지오코딩 (기존 DB 데이터 병합 + 좌표→주소 변환)
    await updateCrawlStep(crawlId, 'Reverse geocoding addresses');

    const mergedCount = await mergeExistingGeoData(complexes);
    logger.info(`Merged ${mergedCount} existing geo data`);

    const geocodedCount = await enrichWithGeocode(complexes);
    logger.info(`Geocoded ${geocodedCount} complexes`);

    // 5. 단지 DB 저장
    await updateCrawlStep(crawlId, 'Saving complex data');

    const complexNoToIdMap = await upsertComplexes(complexes);
    totalComplexes = complexNoToIdMap.size;

    logger.info('Complex upsert completed', { totalComplexes });

    // 6. 매물 정보 처리
    await updateCrawlStep(crawlId, 'Preparing article data');

    let articles = prepareArticleCreateData(crawlData, complexNoToIdMap);

    // 중복 제거
    articles = deduplicateArticles(articles);

    // 통계 계산
    const stats = calculateArticleStats(articles);
    logger.info('Article statistics', stats);

    totalArticles = articles.length;

    // 7. 매물 DB 저장 (Batch Delete + Create)
    await updateCrawlStep(crawlId, 'Saving article data');

    // 기존 매물 삭제
    const complexIds = Array.from(complexNoToIdMap.values());
    await prisma.article.deleteMany({
      where: { complexId: { in: complexIds } },
    });

    logger.info('Deleted old articles', { complexIds: complexIds.length });

    // 새 매물 삽입 (배치)
    if (articles.length > 0) {
      // Prisma의 createMany는 최대 1000개까지만 지원하므로 chunk로 분할
      const BATCH_SIZE = 1000;
      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);

        await prisma.article.createMany({
          data: batch,
          skipDuplicates: true,
        });

        logger.debug('Inserted article batch', {
          batchIndex: Math.floor(i / BATCH_SIZE) + 1,
          batchSize: batch.length,
        });
      }
    }

    logger.info('Article insert completed', { totalArticles });

    // 8. 완료
    await updateCrawlStep(crawlId, 'DB save completed');

    logger.info('Crawl DB save completed successfully', {
      crawlId,
      totalComplexes,
      totalArticles,
      errors: errors.length,
    });

    return {
      totalArticles,
      totalComplexes,
      errors,
    };
  } catch (error: any) {
    logger.error('Failed to save crawl results to DB', {
      crawlId,
      error: error.message,
      stack: error.stack,
    });

    errors.push(`DB save error: ${error.message}`);

    return {
      totalArticles,
      totalComplexes,
      errors,
    };
  }
}
