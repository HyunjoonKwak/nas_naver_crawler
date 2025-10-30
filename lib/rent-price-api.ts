/**
 * 공공데이터포털 아파트 전월세 실거래가 API 라이브러리
 *
 * API 문서: https://www.data.go.kr/data/15058017/openapi.do
 * 서비스: 국토교통부 아파트 전월세 자료
 */

import { parseStringPromise } from 'xml2js';

// ============================================
// 타입 정의
// ============================================

/**
 * 전월세 API 응답 아이템 (XML -> JSON 변환 후)
 */
export interface RentPriceItem {
  // 거래 정보
  aptNm: string;                    // 아파트명
  aptDong: string;                  // 아파트 동
  deposit: string;                  // 보증금 (만원 단위)
  monthlyRent: string;              // 월세 (만원 단위)
  contractTerm?: string;            // 계약기간
  contractType: string;             // 계약구분 (신규/갱신)

  // 거래일자
  year: string;                     // 년도
  month: string;                    // 월
  day: string;                      // 일

  // 위치 정보
  sggCd: string;                    // 시군구코드
  umdNm: string;                    // 읍면동명
  jibun: string;                    // 지번

  // 건물 정보
  excluUseAr: string;               // 전용면적 (제곱미터)
  floor: string;                    // 층수
  buildYear: string;                // 건축년도

  // 기타
  dealingGbn?: string;              // 거래방법 (직거래/중개거래)
  reqGbn?: string;                  // 종전 계속 여부
  useRRRight?: string;              // 갱신요구권 사용 여부
  preDeposit?: string;              // 종전 보증금
  preMonthlyRent?: string;          // 종전 월세
}

/**
 * 가공된 전월세 데이터 (사용자 친화적)
 */
export interface ProcessedRentPrice {
  // 거래 정보
  aptName: string;                  // 아파트명
  aptDong: string;                  // 아파트 동
  deposit: number;                  // 보증금 (원 단위)
  monthlyRent: number;              // 월세 (원 단위)
  depositFormatted: string;         // 보증금 (억/만원 형식)
  monthlyRentFormatted: string;     // 월세 (만원 형식)
  contractType: string;             // 계약구분 (신규/갱신)
  contractTerm?: string;            // 계약기간
  dealDate: string;                 // 계약일자 (YYYY-MM-DD)

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
  tradeType: string;                // 거래유형 (전세/월세)
  dealMethod: string;               // 거래방법 (직거래/중개거래)
}

/**
 * API 요청 파라미터
 */
export interface RentPriceSearchParams {
  lawdCd: string;                   // 법정동코드 (5자리)
  dealYmd: string;                  // 계약년월 (YYYYMM)
  pageNo?: number;                  // 페이지 번호 (기본: 1)
  numOfRows?: number;               // 한 페이지 결과 수 (기본: 100)
}

/**
 * API 응답 구조
 */
export interface RentPriceApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items?: {
        item?: RentPriceItem[];
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
 * 가격 문자열 파싱 (만원 단위 -> 원 단위)
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
  } else if (man > 0) {
    return `${man.toLocaleString()}만원`;
  } else {
    return '0원';
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
export function processRentPriceItem(item: RentPriceItem): ProcessedRentPrice {
  const deposit = parsePrice(item.deposit);
  const monthlyRent = parsePrice(item.monthlyRent);
  const area = parseFloat(item.excluUseAr);
  const areaPyeong = toPyeong(area);

  // 거래유형 결정: 월세가 0이면 전세, 아니면 월세
  const tradeType = monthlyRent === 0 ? '전세' : '월세';

  // 거래방법
  const dealMethod = item.dealingGbn && item.dealingGbn.trim() !== ''
    ? item.dealingGbn.trim()
    : '중개거래';

  return {
    aptName: item.aptNm,
    aptDong: (item.aptDong || '').trim(),
    deposit,
    monthlyRent,
    depositFormatted: formatPrice(deposit),
    monthlyRentFormatted: monthlyRent > 0 ? formatPrice(monthlyRent) : '',
    contractType: item.contractType || '',
    contractTerm: item.contractTerm,
    dealDate: `${item.year}-${item.month.padStart(2, '0')}-${item.day.padStart(2, '0')}`,

    address: `${item.umdNm} ${item.jibun}`,
    dong: item.umdNm,
    jibun: item.jibun,

    area,
    areaPyeong,
    floor: parseInt(item.floor, 10),
    buildYear: parseInt(item.buildYear, 10),

    tradeType,
    dealMethod,
  };
}

// ============================================
// API 클라이언트
// ============================================

export class RentPriceApiClient {
  private serviceKey: string;
  private baseUrl = 'http://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

  constructor(serviceKey: string) {
    if (!serviceKey) {
      throw new Error('PUBLIC_DATA_SERVICE_KEY is required');
    }
    this.serviceKey = serviceKey;
  }

  /**
   * 전월세 실거래가 데이터 조회
   */
  async search(params: RentPriceSearchParams): Promise<{
    items: ProcessedRentPrice[];
    totalCount: number;
    pageNo: number;
    numOfRows: number;
  }> {
    const { lawdCd, dealYmd, pageNo = 1, numOfRows = 100 } = params;

    const url = `${this.baseUrl}?serviceKey=${this.serviceKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${pageNo}&numOfRows=${numOfRows}`;

    console.log(`[Rent Price API] Fetching: ${dealYmd}, lawdCd: ${lawdCd}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Rent Price API] HTTP ${response.status}:`, errorText.substring(0, 500));
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const parsed = await parseStringPromise(xmlText, {
        explicitArray: false,
        trim: true,
      }) as RentPriceApiResponse;

      const { resultCode, resultMsg } = parsed.response.header;
      if (resultCode !== '00' && resultCode !== '000') {
        console.error(`[Rent Price API] Error: ${resultMsg} (code: ${resultCode})`);
        throw new Error(`API Error: ${resultMsg} (code: ${resultCode})`);
      }

      console.log(`[Rent Price API] Success: ${parsed.response.body.totalCount || 0} items`);

      const body = parsed.response.body;
      const rawItems = body.items?.item;

      let items: ProcessedRentPrice[] = [];
      if (rawItems) {
        // item이 배열인지 단일 객체인지 확인
        const itemArray = Array.isArray(rawItems) ? rawItems : [rawItems];
        items = itemArray.map(processRentPriceItem);
      }

      return {
        items,
        totalCount: body.totalCount || 0,
        pageNo: body.pageNo || pageNo,
        numOfRows: body.numOfRows || numOfRows,
      };
    } catch (error: any) {
      console.error('[Rent Price API] Error:', error);
      throw error;
    }
  }

  /**
   * 여러 페이지 데이터를 한 번에 조회 (페이지네이션 자동 처리)
   */
  async searchAll(lawdCd: string, dealYmd: string): Promise<ProcessedRentPrice[]> {
    const firstPage = await this.search({ lawdCd, dealYmd, pageNo: 1, numOfRows: 100 });

    const allItems = [...firstPage.items];
    const totalPages = Math.ceil(firstPage.totalCount / firstPage.numOfRows);

    // 2페이지부터 나머지 조회
    for (let page = 2; page <= totalPages; page++) {
      const pageData = await this.search({ lawdCd, dealYmd, pageNo: page, numOfRows: 100 });
      allItems.push(...pageData.items);
    }

    return allItems;
  }
}

/**
 * 전월세 API 클라이언트 인스턴스 생성 (싱글톤)
 */
let rentApiClient: RentPriceApiClient | null = null;

export function getRentPriceApiClient(): RentPriceApiClient {
  if (!rentApiClient) {
    const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY;
    if (!serviceKey) {
      throw new Error('PUBLIC_DATA_SERVICE_KEY is not configured in environment variables');
    }
    rentApiClient = new RentPriceApiClient(serviceKey);
  }
  return rentApiClient;
}
