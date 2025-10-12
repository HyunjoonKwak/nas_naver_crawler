import { NextRequest, NextResponse } from 'next/server';

// TODO: 공공데이터포털 API 연동 시 실제 구현
// API URL: http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev
// 필요 파라미터: ServiceKey, LAWD_CD(법정동코드), DEAL_YMD(계약년월)

interface RealPriceTransaction {
  transactionDate: string;      // 거래일 (YYYY-MM-DD)
  dong: string;                 // 동
  ho: string;                   // 호
  area: number;                 // 전용면적(㎡)
  areaType: string;            // 평형 (예: 84㎡)
  floor: number;                // 층
  price: number;                // 거래금액(원)
  pricePerArea: number;         // ㎡당 가격
  tradeType: string;            // 거래유형 (A1:매매, B1:전세, B2:월세)
  buildYear?: number;           // 건축년도
}

interface AreaStats {
  areaType: string;             // 평형
  avgPrice: number;             // 평균가
  maxPrice: number;             // 최고가
  minPrice: number;             // 최저가
  transactionCount: number;     // 거래건수
}

interface ChartData {
  month: string;                // 월 (YYYY-MM)
  avgPrice: number;             // 평균가
  maxPrice: number;             // 최고가
  minPrice: number;             // 최저가
}

// Mock 데이터 생성 함수
function generateMockData(complexNo: string): {
  transactions: RealPriceTransaction[];
  areaStats: AreaStats[];
  chartData: ChartData[];
} {
  const now = new Date();
  const transactions: RealPriceTransaction[] = [];
  const monthlyData: { [key: string]: number[] } = {};

  // 최근 6개월 거래 데이터 생성
  for (let i = 0; i < 20; i++) {
    const monthsAgo = Math.floor(Math.random() * 6);
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1);
    const area = [59, 84, 114][Math.floor(Math.random() * 3)];
    const basePrice = area === 59 ? 280000000 : area === 84 ? 350000000 : 450000000;
    const price = basePrice + Math.floor(Math.random() * 50000000);

    transactions.push({
      transactionDate: date.toISOString().split('T')[0],
      dong: `${Math.floor(Math.random() * 5) + 101}동`,
      ho: `${Math.floor(Math.random() * 20) + 1}0${Math.floor(Math.random() * 4) + 1}`,
      area,
      areaType: `${Math.floor(area / 3.3)}평형`,
      floor: Math.floor(Math.random() * 20) + 1,
      price,
      pricePerArea: Math.floor(price / area),
      tradeType: 'A1',
      buildYear: 2021
    });

    // 월별 데이터 집계
    const monthKey = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(price);
  }

  // 거래일순 정렬
  transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  // 평형별 통계 계산
  const areaGroups: { [key: string]: number[] } = {};
  transactions.forEach(t => {
    if (!areaGroups[t.areaType]) {
      areaGroups[t.areaType] = [];
    }
    areaGroups[t.areaType].push(t.price);
  });

  const areaStats: AreaStats[] = Object.entries(areaGroups).map(([areaType, prices]) => ({
    areaType,
    avgPrice: Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length),
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
    transactionCount: prices.length
  }));

  // 차트 데이터 생성
  const chartData: ChartData[] = Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, prices]) => ({
      month,
      avgPrice: Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length),
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices)
    }));

  return { transactions, areaStats, chartData };
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const complexNo = searchParams.get('complexNo');
    const period = searchParams.get('period') || '6m'; // 1m, 3m, 6m, 1y, all

    if (!complexNo) {
      return NextResponse.json(
        { error: 'complexNo is required' },
        { status: 400 }
      );
    }

    // TODO: 공공데이터포털 API 연동
    // 현재는 Mock 데이터 반환
    const mockData = generateMockData(complexNo);

    return NextResponse.json({
      success: true,
      complexNo,
      period,
      data: mockData,
      // API 연동 준비 상태 표시
      dataSource: 'mock', // 'mock' | 'api'
      apiStatus: '공공데이터포털 API 연동 준비중'
    });

  } catch (error) {
    console.error('Real price API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real price data' },
      { status: 500 }
    );
  }
}

// 공공데이터포털 API 연동을 위한 함수 (준비)
async function fetchFromPublicAPI(
  serviceKey: string,
  lawdCd: string,
  dealYmd: string
): Promise<any> {
  // TODO: 공공데이터포털 API 호출 구현
  // const url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev`;
  // const params = new URLSearchParams({
  //   serviceKey,
  //   LAWD_CD: lawdCd,
  //   DEAL_YMD: dealYmd,
  //   numOfRows: '100'
  // });

  throw new Error('API not implemented yet');
}
