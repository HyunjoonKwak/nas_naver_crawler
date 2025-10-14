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
    const complexName = searchParams.get('complexName');
    const lawdCd = searchParams.get('lawdCd');  // 법정동코드 (5자리)
    const period = searchParams.get('period') || '6m'; // 1m, 3m, 6m, 1y
    const useMock = searchParams.get('mock') === 'true';  // 강제 Mock 모드

    if (!complexNo) {
      return NextResponse.json(
        { error: 'complexNo is required' },
        { status: 400 }
      );
    }

    // 환경 변수에서 서비스 키 가져오기
    const serviceKey = process.env.MOLIT_SERVICE_KEY;

    // API 키가 없거나, Mock 모드 강제, 또는 필요한 파라미터 부족 시 Mock 데이터 사용
    if (!serviceKey || useMock || !complexName || !lawdCd) {
      console.log('[Real Price API] Mock 데이터 사용');
      console.log('[Real Price API]   사유:',
        !serviceKey ? 'API 키 없음' :
        useMock ? '강제 Mock 모드' :
        !complexName ? '단지명 없음' :
        !lawdCd ? '법정동코드 없음' : '알 수 없음'
      );

      const mockData = generateMockData(complexNo);

      return NextResponse.json({
        success: true,
        complexNo,
        period,
        data: mockData,
        dataSource: 'mock',
        apiStatus: !serviceKey
          ? 'MOLIT_SERVICE_KEY 환경변수 미설정 - config.env 확인 필요'
          : !lawdCd
          ? '법정동코드 없음 - 지오코딩 먼저 실행 필요'
          : 'Mock 모드'
      });
    }

    // 기간에 따른 조회 개월 수 결정
    const monthsMap: { [key: string]: number } = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
      'all': 24  // 최대 2년
    };
    const monthsCount = monthsMap[period] || 6;

    console.log('[Real Price API] 실제 API 조회 시작');
    console.log('[Real Price API]   단지:', complexName, `(${complexNo})`);
    console.log('[Real Price API]   법정동코드:', lawdCd);
    console.log('[Real Price API]   조회 기간:', period, `(${monthsCount}개월)`);

    // 실제 API 조회
    try {
      const transactions = await fetchMultipleMonths(
        serviceKey,
        lawdCd,
        complexName,
        monthsCount
      );

      // 거래일순 정렬
      transactions.sort((a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );

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

      // 월별 차트 데이터 생성
      const monthlyData: { [key: string]: number[] } = {};
      transactions.forEach(t => {
        const month = t.transactionDate.substring(0, 7).replace('-', '.');
        if (!monthlyData[month]) {
          monthlyData[month] = [];
        }
        monthlyData[month].push(t.price);
      });

      const chartData: ChartData[] = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, prices]) => ({
          month,
          avgPrice: Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length),
          maxPrice: Math.max(...prices),
          minPrice: Math.min(...prices)
        }));

      console.log('[Real Price API] ✅ 조회 성공:', transactions.length, '건');

      return NextResponse.json({
        success: true,
        complexNo,
        complexName,
        lawdCd,
        period,
        data: {
          transactions,
          areaStats,
          chartData
        },
        dataSource: 'api',
        apiStatus: '공공데이터포털 연동 성공'
      });

    } catch (apiError: any) {
      console.error('[Real Price API] API 조회 실패, Mock 데이터로 전환:', apiError.message);

      // API 실패 시 Mock 데이터로 폴백
      const mockData = generateMockData(complexNo);

      return NextResponse.json({
        success: true,
        complexNo,
        period,
        data: mockData,
        dataSource: 'mock',
        apiStatus: `API 오류 발생: ${apiError.message}`,
        fallback: true
      });
    }

  } catch (error: any) {
    console.error('[Real Price API] ❌ 전체 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch real price data',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// 공공데이터포털 API 연동 함수
async function fetchFromPublicAPI(
  serviceKey: string,
  lawdCd: string,      // 법정동코드 (5자리)
  dealYmd: string,     // 계약년월 (YYYYMM)
  complexName: string  // 아파트 이름 (필터링용)
): Promise<RealPriceTransaction[]> {
  console.log('[MOLIT API] 🏢 실거래가 조회 시작');
  console.log('[MOLIT API]   법정동코드:', lawdCd);
  console.log('[MOLIT API]   계약년월:', dealYmd);
  console.log('[MOLIT API]   단지명:', complexName);

  const url = `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev`;
  const params = new URLSearchParams({
    serviceKey,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    numOfRows: '1000'  // 최대 조회 개수
  });

  const fullUrl = `${url}?${params.toString()}`;

  try {
    const response = await fetch(fullUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // XML 파싱 (간단한 정규식 사용 - 프로덕션에서는 xml2js 등 사용 권장)
    const items: RealPriceTransaction[] = [];
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const itemXml = match[1];

      // 각 필드 추출
      const getTag = (tag: string) => {
        const regex = new RegExp(`<${tag}>([^<]*)<\/${tag}>`);
        const match = itemXml.match(regex);
        return match ? match[1].trim() : '';
      };

      const aptName = getTag('아파트');

      // 단지명으로 필터링 (공백 제거하고 비교)
      if (!aptName.replace(/\s/g, '').includes(complexName.replace(/\s/g, ''))) {
        continue;  // 다른 단지는 스킵
      }

      const year = getTag('년');
      const month = getTag('월');
      const day = getTag('일');
      const dong = getTag('법정동');
      const jibun = getTag('지번');
      const floor = getTag('층');
      const exclusiveArea = getTag('전용면적');
      const dealAmount = getTag('거래금액');
      const buildYear = getTag('건축년도');
      const aptDong = getTag('동');
      const aptHo = getTag('호');

      // 거래금액 파싱 (쉼표 제거 후 만원 단위 → 원 단위)
      const price = parseInt(dealAmount.replace(/,/g, '')) * 10000;
      const area = parseFloat(exclusiveArea);

      items.push({
        transactionDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        dong: aptDong || dong || '-',
        ho: aptHo || '-',
        area,
        areaType: `${Math.floor(area / 3.3)}평형`,
        floor: parseInt(floor) || 0,
        price,
        pricePerArea: Math.floor(price / area),
        tradeType: 'A1',  // 매매 고정 (전월세는 다른 API 사용)
        buildYear: parseInt(buildYear) || undefined
      });
    }

    console.log('[MOLIT API] ✅ 조회 완료:', items.length, '건');
    return items;

  } catch (error: any) {
    console.error('[MOLIT API] ❌ 오류:', error.message);
    throw error;
  }
}

// 여러 달의 데이터를 조회하는 헬퍼 함수
async function fetchMultipleMonths(
  serviceKey: string,
  lawdCd: string,
  complexName: string,
  monthsCount: number = 6
): Promise<RealPriceTransaction[]> {
  const transactions: RealPriceTransaction[] = [];
  const now = new Date();

  for (let i = 0; i < monthsCount; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dealYmd = `${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    try {
      const monthData = await fetchFromPublicAPI(serviceKey, lawdCd, dealYmd, complexName);
      transactions.push(...monthData);

      // API 호출 간 딜레이 (초당 요청 제한 고려)
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.warn(`[MOLIT API] ${dealYmd} 조회 실패:`, error.message);
      // 한 달 실패해도 계속 진행
    }
  }

  return transactions;
}
