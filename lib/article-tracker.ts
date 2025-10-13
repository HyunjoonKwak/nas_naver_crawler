/**
 * 매물 변경 추적 로직
 * 신규 매물, 삭제된 매물, 가격 변동 감지
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ArticleChange {
  newArticles: any[]; // 신규 매물
  deletedArticles: any[]; // 삭제된 매물
  priceChangedArticles: Array<{ // 가격 변동 매물
    old: any;
    new: any;
  }>;
  unchangedCount: number; // 변화 없는 매물
}

/**
 * 이전 크롤링 결과와 비교하여 변경사항 감지
 */
export async function detectArticleChanges(
  complexNo: string,
  currentArticles: any[]
): Promise<ArticleChange> {
  // 이전 매물 데이터 조회
  const previousArticles = await prisma.article.findMany({
    where: {
      complex: {
        complexNo: complexNo,
      },
    },
  });

  // 매물 번호를 키로 하는 맵 생성
  const previousMap = new Map(
    previousArticles.map((article) => [article.articleNo, article])
  );
  const currentMap = new Map(
    currentArticles.map((article) => [article.articleNo, article])
  );

  // 신규 매물 감지
  const newArticles = currentArticles.filter(
    (article) => !previousMap.has(article.articleNo)
  );

  // 삭제된 매물 감지
  const deletedArticles = previousArticles.filter(
    (article) => !currentMap.has(article.articleNo)
  );

  // 가격 변동 감지
  const priceChangedArticles: Array<{ old: any; new: any }> = [];
  let unchangedCount = 0;

  for (const currentArticle of currentArticles) {
    const previousArticle = previousMap.get(currentArticle.articleNo);

    if (previousArticle) {
      // 기존 매물이면 가격 비교
      const oldPrice = parsePrice(previousArticle.dealOrWarrantPrc);
      const newPrice = parsePrice(currentArticle.dealOrWarrantPrc);

      if (oldPrice !== newPrice) {
        priceChangedArticles.push({
          old: previousArticle,
          new: currentArticle,
        });
      } else {
        unchangedCount++;
      }
    }
  }

  return {
    newArticles,
    deletedArticles,
    priceChangedArticles,
    unchangedCount,
  };
}

/**
 * 가격 문자열을 숫자로 변환
 */
function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  if (!price) return 0;

  // 쉼표 제거 후 숫자로 변환
  return parseInt(price.toString().replace(/,/g, ''));
}

/**
 * 알림 조건에 맞는지 확인
 */
export function matchesAlertCondition(article: any, alert: any): boolean {
  // 거래 유형 필터
  if (alert.tradeTypes && alert.tradeTypes.length > 0) {
    if (!alert.tradeTypes.includes(article.tradeTypeName)) {
      return false;
    }
  }

  // 가격 필터
  const price = parsePrice(article.dealOrWarrantPrc);
  if (alert.minPrice && price < alert.minPrice) {
    return false;
  }
  if (alert.maxPrice && price > alert.maxPrice) {
    return false;
  }

  // 면적 필터
  if (alert.minArea && article.area1 < alert.minArea) {
    return false;
  }
  if (alert.maxArea && article.area1 > alert.maxArea) {
    return false;
  }

  return true;
}

/**
 * 활성화된 알림 설정 조회
 */
export async function getActiveAlerts(complexNo: string) {
  const alerts = await prisma.alert.findMany({
    where: {
      isActive: true,
      complexIds: {
        has: complexNo,
      },
    },
  });

  return alerts;
}

/**
 * 알림 로그 저장
 */
export async function saveNotificationLog(
  alertId: string,
  type: 'browser' | 'email' | 'webhook',
  status: 'sent' | 'failed',
  message: string,
  articleId?: string
) {
  await prisma.notificationLog.create({
    data: {
      alertId,
      type,
      status,
      message,
      articleId,
    },
  });
}

/**
 * 변경사항을 필터링하여 알림 대상 추출
 */
export async function filterChangesForAlerts(
  complexNo: string,
  changes: ArticleChange
): Promise<{
  alertId: string;
  alert: any;
  newArticles: any[];
  deletedArticles: any[];
  priceChangedArticles: Array<{ old: any; new: any }>;
}[]> {
  const alerts = await getActiveAlerts(complexNo);
  const results: any[] = [];

  for (const alert of alerts) {
    // 조건에 맞는 신규 매물 필터링
    const filteredNewArticles = changes.newArticles.filter((article) =>
      matchesAlertCondition(article, alert)
    );

    // 조건에 맞는 삭제된 매물 필터링
    const filteredDeletedArticles = changes.deletedArticles.filter((article) =>
      matchesAlertCondition(article, alert)
    );

    // 조건에 맞는 가격 변동 매물 필터링
    const filteredPriceChangedArticles = changes.priceChangedArticles.filter(
      ({ new: newArticle }) => matchesAlertCondition(newArticle, alert)
    );

    // 알림 대상이 있는 경우만 추가
    if (
      filteredNewArticles.length > 0 ||
      filteredDeletedArticles.length > 0 ||
      filteredPriceChangedArticles.length > 0
    ) {
      results.push({
        alertId: alert.id,
        alert,
        newArticles: filteredNewArticles,
        deletedArticles: filteredDeletedArticles,
        priceChangedArticles: filteredPriceChangedArticles,
      });
    }
  }

  return results;
}

/**
 * 단지 정보 조회
 */
export async function getComplexInfo(complexNo: string) {
  const complex = await prisma.complex.findUnique({
    where: { complexNo },
  });

  return complex;
}
