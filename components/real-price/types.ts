/**
 * 실거래가 분석 관련 타입 정의
 */

export interface RealPriceItem {
  dealDate: string;
  dong: string;
  jibun: string;
  apartmentName: string;
  exclusiveArea: number;
  supplyPyeong: number | null; // 공급평형 (매물정보 기준)
  dealAmount: string; // 문자열 (원 단위)
  dealPrice: number; // 숫자 (원 단위)
  dealPriceFormatted: string; // 포맷된 문자열
  floor: number;
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  cancelDealType?: string;
}

export interface AreaMapping {
  exclusivePyeong: number; // 전용면적 평형
  supplyPyeong: number; // 공급면적 평형
  supplyArea: number; // 공급면적 ㎡
}

export interface ComplexInfo {
  complexNo: string;
  complexName: string;
  beopjungdong: string | null;
  lawdCd: string;
}

export interface RealPriceData {
  complex: ComplexInfo;
  areaMapping: AreaMapping[]; // 면적 매핑 정보
  months: string[];
  items: RealPriceItem[];
  totalCount: number;
}

export interface AreaStats {
  areaType: string;
  exclusiveArea: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  transactionCount: number;
  items: RealPriceItem[];
}

export interface ChartData {
  month: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  count: number;
}

export interface PyeongChartData {
  month: string;
  [pyeong: string]: string | number; // 동적 평형별 가격 필드
}

export type SortField = 'date' | 'price' | 'area';
export type SortDirection = 'asc' | 'desc';
export type ChartViewMode = 'overall' | 'byPyeong';
