/**
 * 가격 문자열 파싱 및 통계 계산 유틸리티
 */

/**
 * 가격 문자열을 숫자로 변환
 * 예: "3억 5,000" → 350000000 (원 단위)
 * 예: "5,000" → 50000000 (만원 → 원)
 * 예: "1억" → 100000000
 */
export function parsePriceToWon(priceStr: string | null | undefined): number {
  if (!priceStr || priceStr === '-') return 0;

  let totalWon = 0;
  const cleanStr = priceStr.replace(/\s+/g, ''); // 공백 제거

  // "억" 단위 추출
  const eokMatch = cleanStr.match(/(\d+)억/);
  if (eokMatch) {
    totalWon += parseInt(eokMatch[1]) * 100000000; // 1억 = 100,000,000원
  }

  // "억" 뒤의 만원 단위 추출
  const manMatch = cleanStr.match(/억([\d,]+)/);
  if (manMatch) {
    const manValue = parseInt(manMatch[1].replace(/,/g, ''));
    totalWon += manValue * 10000; // 만원 → 원
  } else if (!eokMatch) {
    // "억" 단위가 없으면 전체를 만원으로 간주
    const onlyNumber = cleanStr.match(/^([\d,]+)$/);
    if (onlyNumber) {
      const manValue = parseInt(onlyNumber[1].replace(/,/g, ''));
      totalWon = manValue * 10000;
    }
  }

  return totalWon;
}

/**
 * 원 단위를 억/만원 형식으로 변환
 * 예: 350000000 → "3억 5,000"
 */
export function formatWonToPrice(won: number): string {
  if (won === 0) return '-';

  const eok = Math.floor(won / 100000000);
  const man = Math.floor((won % 100000000) / 10000);

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}`;
  } else if (eok > 0) {
    return `${eok}억`;
  } else {
    return man.toLocaleString();
  }
}

/**
 * 매물 가격 통계 인터페이스
 */
export interface PriceStats {
  avgPrice: number;      // 평균 가격 (원)
  minPrice: number;      // 최저 가격 (원)
  maxPrice: number;      // 최고 가격 (원)
  avgPriceFormatted: string;
  minPriceFormatted: string;
  maxPriceFormatted: string;
}

/**
 * 매물 배열에서 가격 통계 계산
 */
export function calculatePriceStats(
  articles: Array<{ dealOrWarrantPrc: string; rentPrc?: string | null; tradeTypeName: string }>
): PriceStats | null {
  if (!articles || articles.length === 0) {
    return null;
  }

  const prices = articles
    .map(article => {
      // 월세의 경우 보증금만 사용 (rentPrc는 별도 표시)
      return parsePriceToWon(article.dealOrWarrantPrc);
    })
    .filter(price => price > 0); // 0원 제외

  if (prices.length === 0) {
    return null;
  }

  const avgPrice = Math.floor(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    avgPrice,
    minPrice,
    maxPrice,
    avgPriceFormatted: formatWonToPrice(avgPrice),
    minPriceFormatted: formatWonToPrice(minPrice),
    maxPriceFormatted: formatWonToPrice(maxPrice),
  };
}

/**
 * 24시간 가격 변동률 계산
 * @param currentStats 현재 통계
 * @param previousStats 24시간 전 통계
 * @returns 변동률 (%) - 양수: 상승, 음수: 하락
 */
export function calculatePriceChange(
  currentStats: PriceStats | null,
  previousStats: PriceStats | null
): number {
  if (!currentStats || !previousStats || previousStats.avgPrice === 0) {
    return 0;
  }

  const change = ((currentStats.avgPrice - previousStats.avgPrice) / previousStats.avgPrice) * 100;
  return Math.round(change * 10) / 10; // 소수점 1자리
}

/**
 * 거래 유형별 통계
 */
export interface TradeTypeStats {
  tradeTypeName: string;
  count: number;
  priceStats: PriceStats | null;
}

/**
 * 거래 유형별 그룹핑 및 통계
 */
export function calculateTradeTypeStats(
  articles: Array<{ dealOrWarrantPrc: string; rentPrc?: string | null; tradeTypeName: string }>
): TradeTypeStats[] {
  const grouped = articles.reduce((acc, article) => {
    if (!acc[article.tradeTypeName]) {
      acc[article.tradeTypeName] = [];
    }
    acc[article.tradeTypeName].push(article);
    return acc;
  }, {} as Record<string, typeof articles>);

  return Object.entries(grouped).map(([tradeTypeName, tradeArticles]) => ({
    tradeTypeName,
    count: tradeArticles.length,
    priceStats: calculatePriceStats(tradeArticles),
  }));
}
