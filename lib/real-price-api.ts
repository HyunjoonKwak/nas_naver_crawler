/**
 * 공공데이터포털 아파트 실거래가 API 라이브러리
 *
 * API 문서: https://www.data.go.kr/data/15057511/openapi.do
 * 서비스: 국토교통부 아파트매매 실거래 상세 자료
 */

import { parseStringPromise } from 'xml2js';
import { prisma } from './prisma';

// ============================================
// 타입 정의
// ============================================

/**
 * API 응답 아이템 (XML -> JSON 변환 후)
 */
export interface RealPriceItem {
  // 거래 정보
  aptNm: string;                    // 아파트명
  aptDong: string;                  // 아파트 동 (예: "101동", "A동")
  dealAmount: string;               // 거래금액 (예: " 82,500")
  dealYear: string;                 // 거래년도
  dealMonth: string;                // 거래월
  dealDay: string;                  // 거래일

  // 위치 정보
  sggCd: string;                    // 시군구코드
  umdNm: string;                    // 읍면동명
  umdCd: string;                    // 읍면동코드
  jibun: string;                    // 지번
  roadNm?: string;                  // 도로명
  bonbun?: string;                  // 본번
  bubun?: string;                   // 부번

  // 건물 정보
  excluUseAr: string;               // 전용면적 (제곱미터)
  floor: string;                    // 층수
  buildYear: string;                // 건축년도

  // 기타
  aptSeq: string;                   // 일련번호
  cdealType: string;                // 거래유형 (직거래, 중개거래)
  cdealDay: string;                 // 해제사유발생일
  dealingGbn: string;               // 거래구분 (매매, 전세 등)
  estateAgentSggNm: string;         // 중개사소재지
  rgstDate: string;                 // 등록일자
  slerGbn: string;                  // 매도자구분
  buyerGbn: string;                 // 매수자구분
  landLeaseholdGbn?: string;        // 토지임대 여부 (N: 일반, Y: 토지임대)
}

/**
 * 가공된 실거래가 데이터 (사용자 친화적)
 */
export interface ProcessedRealPrice {
  // 거래 정보
  aptName: string;                  // 아파트명
  aptDong: string;                  // 아파트 동 (예: "101동", 공백이면 빈 문자열)
  dealPrice: number;                // 거래금액 (원 단위)
  dealPriceFormatted: string;       // 거래금액 (억/만원 형식)
  dealDate: string;                 // 거래일자 (YYYY-MM-DD)

  // 위치 정보
  address: string;                  // 전체 주소
  dong: string;                     // 읍면동명
  jibun: string;                    // 지번

  // 건물 정보
  area: number;                     // 전용면적 (제곱미터)
  areaPyeong: number;               // 전용면적 (평)
  floor: number;                    // 층수
  buildYear: number;                // 건축년도

  // 기타
  dealType: string;                 // 거래유형 (직거래/중개거래)
  pricePerPyeong: number;           // 평당 가격
  rgstDate: string;                 // 등록일자 (등기 여부 판단용)
}

/**
 * API 요청 파라미터
 */
export interface RealPriceSearchParams {
  lawdCd: string;                   // 법정동코드 (5자리)
  dealYmd: string;                  // 거래년월 (YYYYMM)
  pageNo?: number;                  // 페이지 번호 (기본: 1)
  numOfRows?: number;               // 한 페이지 결과 수 (기본: 100)
}

/**
 * API 응답 구조
 */
export interface RealPriceApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items?: {
        item?: RealPriceItem[];
      };
      totalCount?: number;
      pageNo?: number;
      numOfRows?: number;
    };
  };
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 가격 문자열 파싱 (예: " 82,500" -> 825000000)
 */
function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/,/g, '').trim();
  return parseInt(cleaned, 10) * 10000; // 만원 단위 -> 원 단위
}

/**
 * 가격을 억/만원 형식으로 포맷팅
 */
export function formatPrice(price: number): string {
  const eok = Math.floor(price / 100000000);
  const man = Math.floor((price % 100000000) / 10000);

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}만원`;
  } else if (eok > 0) {
    return `${eok}억원`;
  } else {
    return `${man.toLocaleString()}만원`;
  }
}

/**
 * 제곱미터를 평으로 변환
 */
function toPyeong(squareMeter: number): number {
  return Math.round(squareMeter / 3.3058 * 10) / 10;
}

/**
 * 원본 데이터를 사용자 친화적 형식으로 변환
 */
export function processRealPriceItem(item: RealPriceItem): ProcessedRealPrice {
  const dealPrice = parsePrice(item.dealAmount);
  const area = parseFloat(item.excluUseAr);
  const areaPyeong = toPyeong(area);

  return {
    aptName: item.aptNm,
    aptDong: (item.aptDong || '').trim(), // 공백 제거
    dealPrice,
    dealPriceFormatted: formatPrice(dealPrice),
    dealDate: `${item.dealYear}-${item.dealMonth.padStart(2, '0')}-${item.dealDay.padStart(2, '0')}`,

    address: `${item.umdNm} ${item.jibun}`,
    dong: item.umdNm,
    jibun: item.jibun,

    area,
    areaPyeong,
    floor: parseInt(item.floor, 10),
    buildYear: parseInt(item.buildYear, 10),

    dealType: item.dealingGbn || item.cdealType || '직거래',
    pricePerPyeong: Math.round(dealPrice / areaPyeong),
    rgstDate: (item.rgstDate || '').trim(), // 등록일자
  };
}

// ============================================
// API 클라이언트
// ============================================

export class RealPriceApiClient {
  private serviceKey: string;
  private baseUrl = 'http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';

  constructor(serviceKey: string) {
    if (!serviceKey) {
      throw new Error('PUBLIC_DATA_SERVICE_KEY is required');
    }
    this.serviceKey = serviceKey;
  }

  /**
   * 실거래가 데이터 조회
   */
  async search(params: RealPriceSearchParams): Promise<{
    items: ProcessedRealPrice[];
    totalCount: number;
    pageNo: number;
    numOfRows: number;
  }> {
    const { lawdCd, dealYmd, pageNo = 1, numOfRows = 100 } = params;

    // URL 파라미터 구성 (serviceKey는 이미 인코딩된 상태이므로 직접 구성)
    const url = `${this.baseUrl}?serviceKey=${this.serviceKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${pageNo}&numOfRows=${numOfRows}`;

    console.log(`[Real Price API] Fetching: ${dealYmd}, lawdCd: ${lawdCd}`);

    try {
      // API 호출
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Real Price API] HTTP ${response.status}:`, errorText.substring(0, 500));
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // XML 응답 파싱
      const xmlText = await response.text();
      const parsed = await parseStringPromise(xmlText, {
        explicitArray: false,
        trim: true,
      }) as RealPriceApiResponse;

      // 응답 검증
      const { resultCode, resultMsg } = parsed.response.header;
      // 성공 코드: '00' 또는 '000' (API 버전에 따라 다름)
      if (resultCode !== '00' && resultCode !== '000') {
        console.error(`[Real Price API] Error: ${resultMsg} (code: ${resultCode})`);
        console.error(`[Real Price API] URL:`, url.replace(this.serviceKey, '***'));
        throw new Error(`API Error: ${resultMsg} (code: ${resultCode})`);
      }

      console.log(`[Real Price API] Success: ${parsed.response.body.totalCount || 0} items`);

      // 데이터 추출
      const body = parsed.response.body;
      const rawItems = body.items?.item || [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];

      // 데이터 가공
      const processedItems = items
        .filter((item: RealPriceItem) => item && item.aptNm)
        .map((item: RealPriceItem) => processRealPriceItem(item));

      return {
        items: processedItems,
        totalCount: parseInt(body.totalCount?.toString() || '0', 10),
        pageNo: parseInt(body.pageNo?.toString() || '1', 10),
        numOfRows: parseInt(body.numOfRows?.toString() || '100', 10),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch real price data: ${errorMessage}`);
    }
  }

  /**
   * 전체 데이터를 페이징하여 모두 가져오기
   * totalCount가 100건 이상인 경우 자동으로 여러 번 호출
   */
  async searchAll(
    lawdCd: string,
    dealYmd: string
  ): Promise<ProcessedRealPrice[]> {
    const allItems: ProcessedRealPrice[] = [];
    let currentPage = 1;
    const rowsPerPage = 1000; // 한 번에 최대 1000건까지 가져오기

    while (true) {
      const result = await this.search({
        lawdCd,
        dealYmd,
        pageNo: currentPage,
        numOfRows: rowsPerPage,
      });

      allItems.push(...result.items);

      // 모든 데이터를 가져왔는지 확인
      if (allItems.length >= result.totalCount || result.items.length === 0) {
        break;
      }

      currentPage++;

      // 안전장치: 최대 10페이지까지만 (10,000건)
      if (currentPage > 10) {
        console.warn(`[Real Price API] Reached max page limit (10 pages, ${allItems.length} items)`);
        break;
      }
    }

    console.log(`[Real Price API] Total fetched: ${allItems.length} items`);
    return allItems;
  }

  /**
   * 특정 아파트의 실거래가 조회
   * 공백을 제거하고 비교하여 띄어쓰기 차이 무시
   * @param lawdCd 법정동코드 (5자리)
   * @param dealYmd 조회 년월 (YYYYMM)
   * @param aptName 아파트명
   * @param exactMatch true면 정확히 일치하는 것만, false면 부분 일치 포함 (기본값: false)
   */
  async searchByAptName(
    lawdCd: string,
    dealYmd: string,
    aptName: string,
    exactMatch: boolean = false
  ): Promise<ProcessedRealPrice[]> {
    // 전체 데이터 가져오기
    const allItems = await this.searchAll(lawdCd, dealYmd);

    // 공백 제거 후 비교 (띄어쓰기 차이 무시)
    const normalizedSearchName = aptName.replace(/\s+/g, '').toLowerCase();

    return allItems.filter(item => {
      const normalizedItemName = item.aptName.replace(/\s+/g, '').toLowerCase();

      if (exactMatch) {
        // 정확히 일치하는 것만
        return normalizedItemName === normalizedSearchName;
      } else {
        // 부분 일치 포함 (기존 동작)
        return normalizedItemName.includes(normalizedSearchName) ||
               normalizedSearchName.includes(normalizedItemName);
      }
    });
  }

  /**
   * 여러 달의 실거래가 조회 (시계열 분석용)
   */
  async searchMultipleMonths(
    lawdCd: string,
    startYmd: string,  // YYYYMM
    endYmd: string     // YYYYMM
  ): Promise<ProcessedRealPrice[]> {
    const results: ProcessedRealPrice[] = [];

    const startYear = parseInt(startYmd.substring(0, 4), 10);
    const startMonth = parseInt(startYmd.substring(4, 6), 10);
    const endYear = parseInt(endYmd.substring(0, 4), 10);
    const endMonth = parseInt(endYmd.substring(4, 6), 10);

    let currentYear = startYear;
    let currentMonth = startMonth;

    while (
      currentYear < endYear ||
      (currentYear === endYear && currentMonth <= endMonth)
    ) {
      const dealYmd = `${currentYear}${currentMonth.toString().padStart(2, '0')}`;

      try {
        const result = await this.search({ lawdCd, dealYmd });
        results.push(...result.items);

        // Rate limiting 방지 (요청 간 0.5초 대기)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to fetch data for ${dealYmd}:`, errorMessage);
      }

      // 다음 달로
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return results;
  }

  /**
   * 캐시에서 데이터 조회 (만료되지 않은 캐시만)
   * @private
   */
  private async getCachedData(
    lawdCd: string,
    dealYmd: string,
    aptName?: string
  ): Promise<ProcessedRealPrice[] | null> {
    try {
      const normalizedAptName = aptName ? aptName.replace(/\s+/g, '').toLowerCase() : '';

      // 아파트명이 있으면 해당 아파트 캐시만, 없으면 전체 지역 캐시
      const cacheEntry = await prisma.realPriceCache.findUnique({
        where: {
          lawdCd_dealYmd_aptName: {
            lawdCd,
            dealYmd,
            aptName: normalizedAptName,
          },
        },
      });

      if (!cacheEntry) {
        return null;
      }

      // 만료 확인
      if (new Date() > cacheEntry.expiresAt) {
        console.log(`[Real Price Cache] Expired cache for ${lawdCd}-${dealYmd}-${normalizedAptName}`);
        return null;
      }

      console.log(`[Real Price Cache] HIT for ${lawdCd}-${dealYmd}-${normalizedAptName} (${cacheEntry.totalCount} items)`);
      return cacheEntry.cachedData as ProcessedRealPrice[];
    } catch (error) {
      console.error('[Real Price Cache] Error reading cache:', error);
      return null;
    }
  }

  /**
   * 캐시에 데이터 저장 (30일 TTL)
   * @private
   */
  private async setCachedData(
    lawdCd: string,
    dealYmd: string,
    aptName: string,
    data: ProcessedRealPrice[]
  ): Promise<void> {
    try {
      const normalizedAptName = aptName.replace(/\s+/g, '').toLowerCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30일 후 만료

      await prisma.realPriceCache.upsert({
        where: {
          lawdCd_dealYmd_aptName: {
            lawdCd,
            dealYmd,
            aptName: normalizedAptName,
          },
        },
        create: {
          lawdCd,
          dealYmd,
          aptName: normalizedAptName,
          cachedData: data as any,
          totalCount: data.length,
          expiresAt,
        },
        update: {
          cachedData: data as any,
          totalCount: data.length,
          expiresAt,
          updatedAt: new Date(),
        },
      });

      console.log(`[Real Price Cache] SET for ${lawdCd}-${dealYmd}-${normalizedAptName} (${data.length} items)`);
    } catch (error) {
      console.error('[Real Price Cache] Error writing cache:', error);
      // 캐시 저장 실패는 무시 (원본 데이터는 반환됨)
    }
  }

  /**
   * 특정 아파트의 실거래가 조회 (캐시 우선)
   * 공백을 제거하고 비교하여 띄어쓰기 차이 무시
   * @param lawdCd 법정동코드 (5자리)
   * @param dealYmd 조회 년월 (YYYYMM)
   * @param aptName 아파트명
   * @param exactMatch true면 정확히 일치하는 것만, false면 부분 일치 포함 (기본값: false)
   * @param useCache 캐시 사용 여부 (기본값: true)
   */
  async searchByAptNameCached(
    lawdCd: string,
    dealYmd: string,
    aptName: string,
    exactMatch: boolean = false,
    useCache: boolean = true
  ): Promise<ProcessedRealPrice[]> {
    const normalizedAptName = aptName.replace(/\s+/g, '').toLowerCase();

    // 1. 캐시 확인
    if (useCache) {
      const cached = await this.getCachedData(lawdCd, dealYmd, normalizedAptName);
      if (cached) {
        return cached;
      }
    }

    // 2. 캐시 미스 - API 호출
    console.log(`[Real Price Cache] MISS for ${lawdCd}-${dealYmd}-${normalizedAptName}, fetching from API...`);
    const allItems = await this.searchAll(lawdCd, dealYmd);

    // 3. 필터링
    const filtered = allItems.filter(item => {
      const normalizedItemName = item.aptName.replace(/\s+/g, '').toLowerCase();

      if (exactMatch) {
        return normalizedItemName === normalizedAptName;
      } else {
        return normalizedItemName.includes(normalizedAptName) ||
               normalizedAptName.includes(normalizedItemName);
      }
    });

    // 4. 캐시 저장 (정확히 일치하는 아파트만 캐시)
    if (useCache && exactMatch && filtered.length > 0) {
      await this.setCachedData(lawdCd, dealYmd, normalizedAptName, filtered);
    }

    return filtered;
  }
}

// ============================================
// 싱글톤 인스턴스 (옵션)
// ============================================

let apiClient: RealPriceApiClient | null = null;

export function getRealPriceApiClient(): RealPriceApiClient {
  if (!apiClient) {
    const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY;
    if (!serviceKey) {
      throw new Error('PUBLIC_DATA_SERVICE_KEY is not configured in environment variables');
    }
    apiClient = new RealPriceApiClient(serviceKey);
  }
  return apiClient;
}

/**
 * 만료된 캐시 정리 (크론잡 등에서 주기적으로 호출)
 */
export async function cleanExpiredRealPriceCache(): Promise<number> {
  try {
    const result = await prisma.realPriceCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`[Real Price Cache] Cleaned ${result.count} expired cache entries`);
    return result.count;
  } catch (error) {
    console.error('[Real Price Cache] Error cleaning expired cache:', error);
    return 0;
  }
}

/**
 * 특정 지역/기간의 캐시 강제 삭제 (수동 갱신용)
 */
export async function invalidateRealPriceCache(
  lawdCd?: string,
  dealYmd?: string,
  aptName?: string
): Promise<number> {
  try {
    const where: any = {};

    if (lawdCd) where.lawdCd = lawdCd;
    if (dealYmd) where.dealYmd = dealYmd;
    if (aptName) where.aptName = aptName.replace(/\s+/g, '').toLowerCase();

    const result = await prisma.realPriceCache.deleteMany({ where });

    console.log(`[Real Price Cache] Invalidated ${result.count} cache entries`);
    return result.count;
  } catch (error) {
    console.error('[Real Price Cache] Error invalidating cache:', error);
    return 0;
  }
}

/**
 * 사용 예시:
 *
 * ```typescript
 * import { getRealPriceApiClient } from '@/lib/real-price-api';
 *
 * // 1. 단일 월 조회
 * const client = getRealPriceApiClient();
 * const result = await client.search({
 *   lawdCd: '11110',      // 서울 종로구
 *   dealYmd: '202501',    // 2025년 1월
 *   pageNo: 1,
 *   numOfRows: 100,
 * });
 *
 * console.log(`총 ${result.totalCount}건 중 ${result.items.length}건 조회`);
 * result.items.forEach(item => {
 *   console.log(`${item.aptName} - ${item.dealPriceFormatted} (${item.areaPyeong}평)`);
 * });
 *
 * // 2. 특정 아파트 검색
 * const items = await client.searchByAptName('11110', '202501', '래미안');
 *
 * // 3. 시계열 조회 (최근 6개월)
 * const timeSeriesData = await client.searchMultipleMonths(
 *   '11110',
 *   '202408',
 *   '202501'
 * );
 * ```
 */
