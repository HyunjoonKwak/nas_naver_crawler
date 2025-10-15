/**
 * 통합 분석 API
 * 단일/다중 단지 분석 데이터 제공
 * GET /api/analytics?complexNos=12345,67890&mode=single|compare
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/analytics - 단지 분석 데이터 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const complexNosParam = searchParams.get('complexNos');
    const mode = searchParams.get('mode') || 'single';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const tradeTypes = searchParams.get('tradeTypes')?.split(',');

    if (!complexNosParam) {
      return NextResponse.json(
        { success: false, error: 'complexNos parameter is required' },
        { status: 400 }
      );
    }

    const complexNos = complexNosParam.split(',');

    console.log('[ANALYTICS] Request:', {
      complexNos,
      mode,
      startDate,
      endDate,
      tradeTypes,
    });

    // 데이터베이스에서 단지 및 매물 정보 조회
    const complexes = await prisma.complex.findMany({
      where: {
        complexNo: {
          in: complexNos,
        },
      },
      include: {
        articles: {
          where: {
            ...(tradeTypes && tradeTypes.length > 0 ? { tradeTypeName: { in: tradeTypes } } : {}),
            ...(startDate ? { articleConfirmYmd: { gte: startDate } } : {}),
            ...(endDate ? { articleConfirmYmd: { lte: endDate } } : {}),
          },
          orderBy: {
            articleConfirmYmd: 'desc',
          },
        },
      },
    });

    console.log('[ANALYTICS] Found complexes:', complexes.length);
    console.log('[ANALYTICS] Articles by complex:', complexes.map(c => ({
      complexNo: c.complexNo,
      complexName: c.complexName,
      articleCount: c.articles.length
    })));

    if (complexes.length === 0) {
      // 사용 가능한 단지 목록 조회
      const availableComplexes = await prisma.complex.findMany({
        select: {
          complexNo: true,
          complexName: true,
          _count: {
            select: { articles: true },
          },
        },
      });

      console.log('[ANALYTICS] Available complexes:', availableComplexes);

      return NextResponse.json({
        success: false,
        error: `Selected complex(es) not found in database. Please crawl these complexes first.`,
        availableComplexes: availableComplexes.map(c => ({
          complexNo: c.complexNo,
          complexName: c.complexName,
          articleCount: c._count.articles,
        })),
        requestedComplexes: complexNos,
      }, { status: 404 });
    }

    if (mode === 'single') {
      // 단일 단지 분석
      return getSingleAnalysis(complexes[0], tradeTypes);
    } else {
      // 다중 단지 비교
      return getCompareAnalysis(complexes, tradeTypes);
    }
  } catch (error: any) {
    console.error('[ANALYTICS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}

/**
 * 단일 단지 심층 분석
 */
function getSingleAnalysis(complex: any, tradeTypes?: string[]) {
  if (!complex) {
    return NextResponse.json({
      success: false,
      error: 'No data found for selected complex',
    });
  }

  // 데이터베이스에서 조회한 articles 배열
  const articles = complex.articles || [];

  console.log('[ANALYTICS] Extracted articles:', {
    length: articles.length,
    isArray: Array.isArray(articles),
    firstArticle: articles[0] ? Object.keys(articles[0]).slice(0, 5) : 'none',
  });

  if (!articles || articles.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No articles found for selected complex. The complex may not have any listings.',
    });
  }

  // 1. 거래유형 분포
  const tradeTypeDistribution = articles.reduce((acc: any, article: any) => {
    const type = article.tradeTypeName;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const tradeTypePieData = Object.entries(tradeTypeDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // 2. 면적별 가격 분포 (산점도 데이터) + 데이터 범위 계산
  const areaVsPriceData = articles
    .filter((a: any) => a.dealOrWarrantPrc && a.area1)
    .map((a: any) => ({
      area: a.area1,
      price: parsePriceToNumber(a.dealOrWarrantPrc),
      tradeType: a.tradeTypeName,
      priceLabel: a.dealOrWarrantPrc,
    }));

  // 실제 데이터 범위 계산 (축 범위 자동 조정용)
  const areas = areaVsPriceData.map((d: any) => d.area);
  const prices = areaVsPriceData.map((d: any) => d.price);
  const dataRange = {
    minArea: Math.min(...areas),
    maxArea: Math.max(...areas),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };

  // 3. 가격 추이 데이터 - 평형별로 구분
  const priceByArea = articles
    .filter((a: any) => a.area1 && a.dealOrWarrantPrc)
    .reduce((acc: any, article: any) => {
      const pyeong = Math.round(article.area1 * 0.3025);
      const price = parsePriceToNumber(article.dealOrWarrantPrc);
      if (!acc[pyeong]) acc[pyeong] = [];
      acc[pyeong].push(price);
      return acc;
    }, {});

  const priceTrendData = [{
    date: new Date().toLocaleDateString('ko-KR'),
    ...Object.entries(priceByArea).reduce((acc: any, [pyeong, prices]: [string, any]) => {
      acc[`${pyeong}평`] = Math.round(prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length);
      return acc;
    }, {}),
  }];

  // 4. 통계 요약 - 전체
  const allPrices = articles
    .filter((a: any) => a.dealOrWarrantPrc)
    .map((a: any) => parsePriceToNumber(a.dealOrWarrantPrc));

  const sortedPrices = [...allPrices].sort((a, b) => a - b);
  const avgPrice = Math.round(allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  // 평당 평균가 계산 - 전체
  const avgPricePerPyeong = Math.round(
    articles
      .filter((a: any) => a.area1 && a.dealOrWarrantPrc)
      .reduce((sum: number, a: any) => {
        const pyeong = a.area1 * 0.3025;
        const price = parsePriceToNumber(a.dealOrWarrantPrc);
        return sum + price / pyeong;
      }, 0) / articles.length
  );

  // 5. 평형별 통계 계산
  const articlesByArea = articles
    .filter((a: any) => a.area1 && a.dealOrWarrantPrc)
    .reduce((acc: any, article: any) => {
      const area = article.area1; // 면적 (㎡)
      const pyeong = Math.round(area * 0.3025); // 평수로 변환

      if (!acc[pyeong]) {
        acc[pyeong] = {
          area,
          pyeong,
          articles: [],
        };
      }
      acc[pyeong].articles.push(article);
      return acc;
    }, {});

  const statisticsByArea = Object.values(articlesByArea).map((group: any) => {
    const prices = group.articles.map((a: any) => parsePriceToNumber(a.dealOrWarrantPrc));
    const sortedPrices = [...prices].sort((a: number, b: number) => a - b);
    const avgPrice = Math.round(prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPricePerPyeong = Math.round(avgPrice / group.pyeong);

    return {
      area: group.area,
      pyeong: group.pyeong,
      count: group.articles.length,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      avgPricePerPyeong,
    };
  }).sort((a: any, b: any) => a.area - b.area); // 면적 기준 오름차순 정렬

  // 6. 가격 분포 히스토그램 - 평형별로 구분
  const priceHistogramByArea = articles
    .filter((a: any) => a.area1 && a.dealOrWarrantPrc)
    .reduce((acc: any, article: any) => {
      const pyeong = Math.round(article.area1 * 0.3025);
      const price = parsePriceToNumber(article.dealOrWarrantPrc);
      const bucket = Math.floor(price / 10000) * 10000; // 1억 단위
      const priceRange = `${(bucket / 10000).toFixed(0)}억`;

      if (!acc[pyeong]) acc[pyeong] = {};
      if (!acc[pyeong][priceRange]) acc[pyeong][priceRange] = 0;
      acc[pyeong][priceRange]++;

      return acc;
    }, {});

  const histogramData = Object.entries(priceHistogramByArea)
    .map(([pyeong, priceRanges]: [string, any]) => ({
      pyeong: `${pyeong}평`,
      data: Object.entries(priceRanges)
        .map(([range, count]) => ({ range, count }))
        .sort((a: any, b: any) => {
          const aNum = parseFloat(a.range);
          const bNum = parseFloat(b.range);
          return aNum - bNum;
        }),
    }))
    .sort((a, b) => parseInt(a.pyeong) - parseInt(b.pyeong));

  return NextResponse.json({
    success: true,
    mode: 'single',
    complex: {
      complexNo: complex.complexNo,
      complexName: complex.complexName,
      totalHousehold: complex.totalHousehold,
      totalDong: complex.totalDong,
    },
    statistics: {
      totalArticles: articles.length,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      avgPricePerPyeong,
    },
    statisticsByArea, // 평형별 통계 추가
    charts: {
      tradeTypeDistribution: tradeTypePieData,
      areaVsPrice: areaVsPriceData,
      areaVsPriceRange: dataRange, // 산점도 축 범위
      priceTrend: priceTrendData,
      priceHistogram: histogramData,
    },
  });
}

/**
 * 다중 단지 비교 분석
 */
function getCompareAnalysis(complexes: any[], tradeTypes?: string[]) {
  if (!complexes || complexes.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No data found for selected complexes',
    });
  }

  const comparisons = complexes.map((complex) => {
    // 데이터베이스에서 조회한 articles 배열
    const articles = complex.articles || [];

    const allPrices = articles
      .filter((a: any) => a.dealOrWarrantPrc)
      .map((a: any) => parsePriceToNumber(a.dealOrWarrantPrc));

    const avgPrice = allPrices.length > 0
      ? Math.round(allPrices.reduce((sum: number, p: number) => sum + p, 0) / allPrices.length)
      : 0;

    const avgPricePerPyeong = articles
      .filter((a: any) => a.area1 && a.dealOrWarrantPrc)
      .reduce((sum: number, a: any) => {
        const pyeong = a.area1 * 0.3025;
        const price = parsePriceToNumber(a.dealOrWarrantPrc);
        return sum + price / pyeong;
      }, 0) / (articles.length || 1);

    // 거래유형별 개수
    const tradeTypeCounts = articles.reduce((acc: any, a: any) => {
      acc[a.tradeTypeName] = (acc[a.tradeTypeName] || 0) + 1;
      return acc;
    }, {});

    return {
      complexNo: complex.complexNo,
      complexName: complex.complexName,
      totalArticles: articles.length,
      avgPrice,
      minPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      maxPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
      avgPricePerPyeong: Math.round(avgPricePerPyeong),
      tradeTypeCounts,
    };
  });

  // 레이더 차트용 정규화된 데이터
  const maxValues = {
    avgPrice: Math.max(...comparisons.map((c) => c.avgPrice)),
    totalArticles: Math.max(...comparisons.map((c) => c.totalArticles)),
    avgPricePerPyeong: Math.max(...comparisons.map((c) => c.avgPricePerPyeong)),
  };

  const radarData = comparisons.map((c) => ({
    complex: c.complexName,
    평균가격: maxValues.avgPrice > 0 ? (c.avgPrice / maxValues.avgPrice) * 100 : 0,
    매물수: maxValues.totalArticles > 0 ? (c.totalArticles / maxValues.totalArticles) * 100 : 0,
    평당가: maxValues.avgPricePerPyeong > 0 ? (c.avgPricePerPyeong / maxValues.avgPricePerPyeong) * 100 : 0,
  }));

  return NextResponse.json({
    success: true,
    mode: 'compare',
    comparisons,
    radarData,
  });
}

/**
 * 가격 문자열을 숫자로 변환 (만원 단위)
 * 예: "5억 3,000" → 53000
 */
function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0;

  let totalInManwon = 0;

  // "억" 파싱
  const ukMatch = priceStr.match(/(\d+(?:\.\d+)?)\s*억/);
  if (ukMatch) {
    totalInManwon += parseFloat(ukMatch[1]) * 10000;
  }

  // "만" 또는 숫자만 파싱
  const manMatch = priceStr.match(/(\d{1,3}(?:,\d{3})*)/g);
  if (manMatch) {
    // 마지막 숫자 그룹을 만원으로 처리
    const lastNumber = manMatch[manMatch.length - 1].replace(/,/g, '');
    totalInManwon += parseInt(lastNumber, 10);
  }

  return totalInManwon;
}
