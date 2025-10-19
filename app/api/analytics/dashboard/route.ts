/**
 * 대시보드 분석 API
 * GET /api/analytics/dashboard
 * 사용자의 전체 관심 단지에 대한 통합 분석 데이터 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { parsePriceToWon } from '@/lib/price-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // 사용자의 관심 단지 ID 조회
    const favorites = await prisma.favorite.findMany({
      where: { userId: currentUser.id },
      select: { complexId: true },
    });

    const favoriteComplexIds = favorites.map(f => f.complexId);

    // 사용자 단지의 매물 조회
    const articles = await prisma.article.findMany({
      where: {
        complex: {
          id: { in: favoriteComplexIds },
        },
      },
      select: {
        id: true,
        dealOrWarrantPrc: true,
        rentPrc: true,
        tradeTypeName: true,
        area1: true,
        createdAt: true,
        complex: {
          select: {
            complexNo: true,
            complexName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // 최근 1000개 매물
    });

    // === 1. 시장 개요 KPI ===
    const totalArticles = articles.length;
    const uniqueComplexes = new Set(articles.map(a => a.complex.complexNo)).size;

    // 가격 통계
    const prices = articles
      .map(a => parsePriceToWon(a.dealOrWarrantPrc))
      .filter(p => p > 0);

    const avgPrice = prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // 가격 포맷팅
    const formatPrice = (won: number): string => {
      if (won === 0) return '-';
      const eok = Math.floor(won / 100000000);
      const man = Math.floor((won % 100000000) / 10000);

      if (eok > 0 && man > 0) {
        return `${eok}억 ${man.toLocaleString()}`;
      } else if (eok > 0) {
        return `${eok}억`;
      } else {
        return `${man.toLocaleString()}`;
      }
    };

    // === 2. 가격 추이 (최근 30일, 일별) ===
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentArticles = articles.filter(a => new Date(a.createdAt) >= thirtyDaysAgo);

    // 날짜별 그룹화
    const priceByDate: Record<string, number[]> = {};
    recentArticles.forEach(article => {
      const date = new Date(article.createdAt).toISOString().split('T')[0];
      const price = parsePriceToWon(article.dealOrWarrantPrc);
      if (price > 0) {
        if (!priceByDate[date]) priceByDate[date] = [];
        priceByDate[date].push(price);
      }
    });

    const priceTrend = Object.keys(priceByDate)
      .sort()
      .map(date => ({
        date,
        avgPrice: priceByDate[date].reduce((sum, p) => sum + p, 0) / priceByDate[date].length,
        count: priceByDate[date].length,
      }));

    // === 3. 단지별 순위 (TOP 10) ===
    const complexCounts: Record<string, { name: string; count: number; prices: number[] }> = {};
    articles.forEach(article => {
      const complexNo = article.complex.complexNo;
      const price = parsePriceToWon(article.dealOrWarrantPrc);

      if (!complexCounts[complexNo]) {
        complexCounts[complexNo] = {
          name: article.complex.complexName,
          count: 0,
          prices: [],
        };
      }
      complexCounts[complexNo].count++;
      if (price > 0) {
        complexCounts[complexNo].prices.push(price);
      }
    });

    const topComplexes = Object.keys(complexCounts)
      .map(complexNo => ({
        complexNo,
        complexName: complexCounts[complexNo].name,
        articleCount: complexCounts[complexNo].count,
        avgPrice: complexCounts[complexNo].prices.length > 0
          ? complexCounts[complexNo].prices.reduce((sum, p) => sum + p, 0) / complexCounts[complexNo].prices.length
          : 0,
        avgPriceFormatted: formatPrice(
          complexCounts[complexNo].prices.length > 0
            ? complexCounts[complexNo].prices.reduce((sum, p) => sum + p, 0) / complexCounts[complexNo].prices.length
            : 0
        ),
      }))
      .sort((a, b) => b.articleCount - a.articleCount)
      .slice(0, 10);

    // === 4. 거래 유형 분포 ===
    const tradeTypeCounts: Record<string, number> = {};
    articles.forEach(article => {
      tradeTypeCounts[article.tradeTypeName] = (tradeTypeCounts[article.tradeTypeName] || 0) + 1;
    });

    const tradeTypeDistribution = Object.keys(tradeTypeCounts).map(type => ({
      type,
      count: tradeTypeCounts[type],
      percentage: totalArticles > 0 ? parseFloat((tradeTypeCounts[type] / totalArticles * 100).toFixed(1)) : 0,
    }));

    // === 5. 평형별 분석 (면적 기준) ===
    const areaBuckets = [
      { label: '소형 (59㎡ 이하)', max: 59, count: 0, prices: [] as number[] },
      { label: '중형 (60-84㎡)', min: 60, max: 84, count: 0, prices: [] as number[] },
      { label: '대형 (85-135㎡)', min: 85, max: 135, count: 0, prices: [] as number[] },
      { label: '특대형 (136㎡ 이상)', min: 136, count: 0, prices: [] as number[] },
    ];

    articles.forEach(article => {
      const area = article.area1;
      const price = parsePriceToWon(article.dealOrWarrantPrc);

      areaBuckets.forEach(bucket => {
        const minOk = bucket.min === undefined || area >= bucket.min;
        const maxOk = bucket.max === undefined || area <= bucket.max;

        if (minOk && maxOk) {
          bucket.count++;
          if (price > 0) {
            bucket.prices.push(price);
          }
        }
      });
    });

    const areaAnalysis = areaBuckets.map(bucket => ({
      label: bucket.label,
      count: bucket.count,
      avgPrice: bucket.prices.length > 0
        ? bucket.prices.reduce((sum, p) => sum + p, 0) / bucket.prices.length
        : 0,
      avgPriceFormatted: formatPrice(
        bucket.prices.length > 0
          ? bucket.prices.reduce((sum, p) => sum + p, 0) / bucket.prices.length
          : 0
      ),
      percentage: totalArticles > 0 ? parseFloat((bucket.count / totalArticles * 100).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalArticles,
          uniqueComplexes,
          avgPrice,
          minPrice,
          maxPrice,
          avgPriceFormatted: formatPrice(avgPrice),
          minPriceFormatted: formatPrice(minPrice),
          maxPriceFormatted: formatPrice(maxPrice),
        },
        priceTrend,
        topComplexes,
        tradeTypeDistribution,
        areaAnalysis,
      },
    });
  } catch (error: any) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { success: false, error: '분석 데이터 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
