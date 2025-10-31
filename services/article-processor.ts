/**
 * 매물 정보 처리 서비스
 *
 * 책임:
 * - 크롤링 데이터를 매물 생성/업데이트 데이터로 변환
 * - 매물 변경 감지 (신규/삭제/가격변경)
 */

import { parsePriceToWonBigInt } from '@/lib/price-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ARTICLE_PROCESSOR');

export interface ArticleCreateData {
  articleNo: string;
  complexId: string;
  realEstateTypeName: string;
  tradeTypeName: string;
  dealOrWarrantPrc: string;
  rentPrc: string | null;
  dealOrWarrantPrcWon: bigint | null;
  rentPrcWon: bigint | null;
  area1: number;
  area2: number | null;
  floorInfo: string | null;
  direction: string | null;
  articleConfirmYmd: string | null;
  buildingName: string | null;
  sameAddrCnt: number | null;
  realtorName: string | null;
  articleFeatureDesc: string | null;
  tagList: any[];
  latitude: number | null;
  longitude: number | null;
}

/**
 * 크롤링 데이터를 매물 생성 데이터로 변환합니다.
 *
 * @param crawlData - 크롤링 데이터 배열
 * @param complexNoToIdMap - complexNo -> complexId 매핑
 * @returns 매물 생성 데이터 배열
 */
export function prepareArticleCreateData(
  crawlData: any[],
  complexNoToIdMap: Map<string, string>
): ArticleCreateData[] {
  const articles: ArticleCreateData[] = [];

  for (const data of crawlData) {
    if (!data.overview || !data.articles) {
      continue;
    }

    const overview = data.overview;
    const articleList = data.articles.articleList || [];

    // complexNo 추출
    const complexNo = overview.complexNo || data.crawling_info?.complex_no;
    if (!complexNo) {
      continue;
    }

    // complexId 조회
    const complexId = complexNoToIdMap.get(complexNo);
    if (!complexId) {
      logger.warn('Complex ID not found for complexNo', { complexNo });
      continue;
    }

    // 각 매물을 변환
    for (const article of articleList) {
      try {
        articles.push({
          articleNo: article.articleNo,
          complexId: complexId,
          realEstateTypeName: article.realEstateTypeName || '아파트',
          tradeTypeName: article.tradeTypeName,
          dealOrWarrantPrc: article.dealOrWarrantPrc,
          rentPrc: article.rentPrc || null,
          // 숫자 가격 컬럼 (성능 최적화용)
          dealOrWarrantPrcWon: parsePriceToWonBigInt(article.dealOrWarrantPrc),
          rentPrcWon: article.rentPrc
            ? parsePriceToWonBigInt(article.rentPrc)
            : null,
          area1: parseFloat(article.area1) || 0,
          area2: article.area2 ? parseFloat(article.area2) : null,
          floorInfo: article.floorInfo || null,
          direction: article.direction || null,
          articleConfirmYmd: article.articleConfirmYmd || null,
          buildingName: article.buildingName || null,
          sameAddrCnt: article.sameAddrCnt
            ? parseInt(article.sameAddrCnt)
            : null,
          realtorName: article.realtorName || null,
          articleFeatureDesc: article.articleFeatureDesc || null,
          tagList: article.tagList || [],
          latitude: article.latitude ? parseFloat(article.latitude) : null,
          longitude: article.longitude ? parseFloat(article.longitude) : null,
        });
      } catch (error: any) {
        logger.warn('Failed to prepare article data', {
          articleNo: article.articleNo,
          error: error.message,
        });
      }
    }
  }

  logger.info('Prepared article create data', {
    totalCount: articles.length,
  });

  return articles;
}

/**
 * 중복된 articleNo를 제거합니다.
 *
 * @param articles - 매물 데이터 배열
 * @returns 중복이 제거된 매물 배열
 */
export function deduplicateArticles(
  articles: ArticleCreateData[]
): ArticleCreateData[] {
  const seen = new Set<string>();
  const deduplicated: ArticleCreateData[] = [];

  for (const article of articles) {
    if (!seen.has(article.articleNo)) {
      seen.add(article.articleNo);
      deduplicated.push(article);
    }
  }

  const duplicateCount = articles.length - deduplicated.length;

  if (duplicateCount > 0) {
    logger.info('Removed duplicate articles', {
      originalCount: articles.length,
      deduplicatedCount: deduplicated.length,
      removedCount: duplicateCount,
    });
  }

  return deduplicated;
}

/**
 * 매물 데이터를 complexId별로 그룹화합니다.
 *
 * @param articles - 매물 데이터 배열
 * @returns complexId -> 매물 배열 맵
 */
export function groupArticlesByComplex(
  articles: ArticleCreateData[]
): Map<string, ArticleCreateData[]> {
  const grouped = new Map<string, ArticleCreateData[]>();

  for (const article of articles) {
    const existing = grouped.get(article.complexId) || [];
    existing.push(article);
    grouped.set(article.complexId, existing);
  }

  return grouped;
}

/**
 * 매물 통계를 계산합니다.
 *
 * @param articles - 매물 데이터 배열
 * @returns 통계 정보
 */
export function calculateArticleStats(articles: ArticleCreateData[]): {
  total: number;
  byTradeType: Record<string, number>;
  byRealEstateType: Record<string, number>;
} {
  const byTradeType: Record<string, number> = {};
  const byRealEstateType: Record<string, number> = {};

  for (const article of articles) {
    // 거래 유형별
    byTradeType[article.tradeTypeName] =
      (byTradeType[article.tradeTypeName] || 0) + 1;

    // 부동산 유형별
    byRealEstateType[article.realEstateTypeName] =
      (byRealEstateType[article.realEstateTypeName] || 0) + 1;
  }

  return {
    total: articles.length,
    byTradeType,
    byRealEstateType,
  };
}
