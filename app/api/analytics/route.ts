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

    // JSON 파일 읽기 (파일 기반)
    const fs = require('fs');
    const path = require('path');
    const crawledDataPath = path.join(process.cwd(), 'crawled_data');

    console.log('[ANALYTICS] Reading from:', crawledDataPath);

    // 최근 크롤링 파일 찾기 (favorites.json 제외)
    let files: string[] = [];
    try {
      files = fs.readdirSync(crawledDataPath);
    } catch (error: any) {
      console.error('[ANALYTICS] Failed to read directory:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to access crawl data directory',
      }, { status: 500 });
    }

    const jsonFiles = files
      .filter((f: string) => f.startsWith('complexes_') && f.endsWith('.json'))
      .sort()
      .reverse();

    console.log('[ANALYTICS] Found files:', jsonFiles.length);

    if (jsonFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No crawl data found. Please run a crawl first.',
      }, { status: 404 });
    }

    // 첫 번째 파일 읽기
    const latestFile = jsonFiles[0];
    const filePath = path.join(crawledDataPath, latestFile);
    console.log('[ANALYTICS] Reading file:', latestFile);

    let crawlData: any;
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      crawlData = JSON.parse(rawData);

      // 파일 구조 확인: 배열인지 객체인지
      const results = Array.isArray(crawlData) ? crawlData : (crawlData.results || []);
      console.log('[ANALYTICS] Parsed data, results count:', results.length);
      console.log('[ANALYTICS] File structure:', Array.isArray(crawlData) ? 'array' : 'object');

      crawlData = results; // 배열로 정규화
    } catch (error: any) {
      console.error('[ANALYTICS] Failed to read/parse file:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to read crawl data file',
      }, { status: 500 });
    }

    // 선택된 단지의 데이터만 필터링
    const filteredResults = crawlData.filter((result: any) => {
      const complexNo = result.crawling_info?.complex_no || result.overview?.complexNo || '';
      return complexNos.includes(complexNo);
    });

    console.log('[ANALYTICS] Filtered results:', filteredResults.length);

    if (filteredResults.length === 0) {
      // 사용 가능한 단지 목록 조회
      const availableComplexes = crawlData.map((r: any) => {
        const info = r.crawling_info || r.overview || {};
        return {
          complexNo: info.complex_no || info.complexNo || 'Unknown',
          complexName: info.complex_name || info.complexName || r.articles?.articleList?.[0]?.articleName || 'Unknown',
        };
      });

      console.log('[ANALYTICS] Available complexes:', availableComplexes);

      return NextResponse.json({
        success: false,
        error: `Selected complex(es) not found in crawl data. Please crawl these complexes first.`,
        availableComplexes,
        requestedComplexes: complexNos,
      }, { status: 404 });
    }

    if (mode === 'single') {
      // 단일 단지 분석
      return getSingleAnalysis(filteredResults[0], tradeTypes);
    } else {
      // 다중 단지 비교
      return getCompareAnalysis(filteredResults, tradeTypes);
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
function getSingleAnalysis(result: any, tradeTypes?: string[]) {
  if (!result) {
    return NextResponse.json({
      success: false,
      error: 'No data found for selected complex',
    });
  }

  // 파일 구조에 따라 articles 추출
  console.log('[ANALYTICS] Result structure:', {
    hasArticles: !!result.articles,
    hasArticleList: !!result.articles?.articleList,
    articlesType: Array.isArray(result.articles) ? 'array' : typeof result.articles,
    articleListLength: result.articles?.articleList?.length,
    articlesLength: Array.isArray(result.articles) ? result.articles.length : 'not array',
  });

  let articles = result.articles?.articleList || result.articles || [];

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

  // 거래유형 필터링
  if (tradeTypes && tradeTypes.length > 0) {
    articles = articles.filter((a: any) => tradeTypes.includes(a.tradeTypeName));
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

  // 2. 면적별 가격 분포 (산점도 데이터)
  const areaVsPriceData = articles
    .filter((a: any) => a.dealOrWarrantPrc && a.area1)
    .map((a: any) => ({
      area: a.area1,
      price: parsePriceToNumber(a.dealOrWarrantPrc),
      tradeType: a.tradeTypeName,
      priceLabel: a.dealOrWarrantPrc,
    }));

  // 3. 가격 추이 데이터 (단일 단지는 크롤링 날짜별 평균)
  // 현재는 단일 시점 데이터이므로 간단히 처리
  const priceByTradeType = articles.reduce((acc: any, article: any) => {
    const type = article.tradeTypeName;
    const price = parsePriceToNumber(article.dealOrWarrantPrc);
    if (!acc[type]) acc[type] = [];
    acc[type].push(price);
    return acc;
  }, {});

  const priceTrendData = [{
    date: new Date().toLocaleDateString('ko-KR'),
    ...Object.entries(priceByTradeType).reduce((acc: any, [type, prices]: [string, any]) => {
      acc[type] = Math.round(prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length);
      return acc;
    }, {}),
  }];

  // 4. 통계 요약
  const allPrices = articles
    .filter((a: any) => a.dealOrWarrantPrc)
    .map((a: any) => parsePriceToNumber(a.dealOrWarrantPrc));

  const sortedPrices = [...allPrices].sort((a, b) => a - b);
  const avgPrice = Math.round(allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  // 평당 평균가 계산
  const avgPricePerPyeong = Math.round(
    articles
      .filter((a: any) => a.area1 && a.dealOrWarrantPrc)
      .reduce((sum: number, a: any) => {
        const pyeong = a.area1 * 0.3025;
        const price = parsePriceToNumber(a.dealOrWarrantPrc);
        return sum + price / pyeong;
      }, 0) / articles.length
  );

  // 5. 가격 분포 히스토그램 (1억 단위)
  const priceHistogram = allPrices.reduce((acc: any, price: number) => {
    const bucket = Math.floor(price / 10000) * 10000; // 1억 단위
    const label = `${(bucket / 10000).toFixed(0)}억`;
    if (!acc[label]) acc[label] = 0;
    acc[label]++;
    return acc;
  }, {});

  const histogramData = Object.entries(priceHistogram)
    .map(([range, count]) => ({ range, count }))
    .sort((a: any, b: any) => {
      const aNum = parseFloat(a.range);
      const bNum = parseFloat(b.range);
      return aNum - bNum;
    });

  // 단지 정보 추출 (파일 구조에 따라)
  const complexInfo = result.crawling_info || result.overview || {};
  const complexNo = complexInfo.complex_no || complexInfo.complexNo || 'Unknown';

  // 첫 번째 article에서 단지명 추출 (overview가 없는 경우)
  const complexName = complexInfo.complex_name ||
                      complexInfo.complexName ||
                      articles[0]?.articleName ||
                      `단지 ${complexNo}`;

  return NextResponse.json({
    success: true,
    mode: 'single',
    complex: {
      complexNo,
      complexName,
      totalHousehold: complexInfo.totalHousehold || null,
      totalDong: complexInfo.totalDong || null,
    },
    statistics: {
      totalArticles: articles.length,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      avgPricePerPyeong,
    },
    charts: {
      tradeTypeDistribution: tradeTypePieData,
      areaVsPrice: areaVsPriceData,
      priceTrend: priceTrendData,
      priceHistogram: histogramData,
    },
  });
}

/**
 * 다중 단지 비교 분석
 */
function getCompareAnalysis(results: any[], tradeTypes?: string[]) {
  if (!results || results.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No data found for selected complexes',
    });
  }

  const comparisons = results.map((result) => {
    // 파일 구조에 따라 articles 추출
    let articles = result.articles?.articleList || result.articles || [];

    // 거래유형 필터링
    if (tradeTypes && tradeTypes.length > 0) {
      articles = articles.filter((a: any) => tradeTypes.includes(a.tradeTypeName));
    }

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

    // 단지 정보 추출
    const complexInfo = result.crawling_info || result.overview || {};
    const complexNo = complexInfo.complex_no || complexInfo.complexNo || 'Unknown';
    const complexName = complexInfo.complex_name ||
                        complexInfo.complexName ||
                        articles[0]?.articleName ||
                        `단지 ${complexNo}`;

    return {
      complexNo,
      complexName,
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
