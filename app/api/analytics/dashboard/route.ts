/**
 * 대시보드 분석 API
 * GET /api/analytics/dashboard
 * 사용자의 전체 관심 단지에 대한 통합 분석 데이터 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// ✅ 추가: 가격 포맷팅 헬퍼 함수
function formatPriceFromWon(won: bigint | number | null): string {
  if (!won) return '-';
  const wonNum = typeof won === 'bigint' ? Number(won) : won;
  const eok = Math.floor(wonNum / 100000000);
  const man = Math.floor((wonNum % 100000000) / 10000);
  
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}`;
  if (eok > 0) return `${eok}억`;
  return `${man.toLocaleString()}`;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // 사용자의 관심 단지 ID 조회
    const favorites = await prisma.favorite.findMany({
      where: { userId: currentUser.id },
      select: { complexId: true },
    });

    const favoriteComplexIds = favorites.map(f => f.complexId);

    if (favoriteComplexIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalArticles: 0,
            uniqueComplexes: 0,
            avgPrice: 0,
            minPrice: 0,
            maxPrice: 0,
            avgPriceFormatted: '-',
            minPriceFormatted: '-',
            maxPriceFormatted: '-',
          },
          priceTrend: [],
          topComplexes: [],
          tradeTypeDistribution: [],
          areaAnalysis: [],
        },
      });
    }

    // ✅ 개선: 매물 개수만 조회
    const totalArticles = await prisma.article.count({
      where: {
        complex: { id: { in: favoriteComplexIds } },
      },
    });

    const uniqueComplexes = favoriteComplexIds.length;

    // ✅ 개선: 가격 통계 (DB 집계)
    const priceStatsResult = await prisma.article.aggregate({
      where: {
        complex: { id: { in: favoriteComplexIds } },
        dealOrWarrantPrcWon: { gt: 0 }
      },
      _avg: { dealOrWarrantPrcWon: true },
      _min: { dealOrWarrantPrcWon: true },
      _max: { dealOrWarrantPrcWon: true },
    });

    const avgPrice = Number(priceStatsResult._avg.dealOrWarrantPrcWon || 0);
    const minPrice = Number(priceStatsResult._min.dealOrWarrantPrcWon || 0);
    const maxPrice = Number(priceStatsResult._max.dealOrWarrantPrcWon || 0);

    // ✅ 개선: 가격 추이 (최근 30일, 일별) - DB 쿼리로 직접 계산
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const priceTrendRaw = await prisma.$queryRaw<Array<{
      date: Date;
      avg_price: number;
      count: number;
    }>>`
      SELECT 
        DATE(created_at) as date,
        AVG(deal_or_warrant_prc_won)::numeric as avg_price,
        COUNT(*)::integer as count
      FROM articles
      WHERE complex_id = ANY(${favoriteComplexIds})
        AND created_at >= ${thirtyDaysAgo}
        AND deal_or_warrant_prc_won > 0
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const priceTrend = priceTrendRaw.map(row => ({
      date: row.date.toISOString().split('T')[0],
      avgPrice: Number(row.avg_price),
      count: row.count,
    }));

    // ✅ 개선: 단지별 순위 (TOP 10) - DB 집계
    const topComplexesRaw = await prisma.article.groupBy({
      by: ['complexId'],
      where: {
        complex: { id: { in: favoriteComplexIds } },
        dealOrWarrantPrcWon: { gt: 0 }
      },
      _count: true,
      _avg: { dealOrWarrantPrcWon: true },
      orderBy: {
        _count: { complexId: 'desc' }
      },
      take: 10,
    });

    // 단지 정보 조회 (한 번에)
    const topComplexIds = topComplexesRaw.map(t => t.complexId);
    const complexesInfo = await prisma.complex.findMany({
      where: { id: { in: topComplexIds } },
      select: { id: true, complexNo: true, complexName: true }
    });

    const topComplexes = topComplexesRaw.map(item => {
      const info = complexesInfo.find(c => c.id === item.complexId);
      return {
        complexNo: info?.complexNo || '',
        complexName: info?.complexName || '',
        articleCount: item._count,
        avgPrice: Number(item._avg.dealOrWarrantPrcWon || 0),
        avgPriceFormatted: formatPriceFromWon(
          item._avg.dealOrWarrantPrcWon ? BigInt(Math.floor(item._avg.dealOrWarrantPrcWon)) : null
        ),
      };
    });

    // ✅ 개선: 거래 유형 분포 (DB 집계)
    const tradeTypeDistributionRaw = await prisma.article.groupBy({
      by: ['tradeTypeName'],
      where: {
        complex: { id: { in: favoriteComplexIds } }
      },
      _count: true,
    });

    const tradeTypeDistribution = tradeTypeDistributionRaw.map(item => ({
      type: item.tradeTypeName,
      count: item._count,
      percentage: totalArticles > 0 ? parseFloat((item._count / totalArticles * 100).toFixed(1)) : 0,
    }));

    // ✅ 개선: 평형별 분석 (DB 쿼리)
    const areaAnalysisRaw = await prisma.$queryRaw<Array<{
      label: string;
      count: number;
      avg_price: number;
    }>>`
      SELECT 
        CASE 
          WHEN area1 <= 59 THEN '소형 (59㎡ 이하)'
          WHEN area1 <= 84 THEN '중형 (60-84㎡)'
          WHEN area1 <= 135 THEN '대형 (85-135㎡)'
          ELSE '특대형 (136㎡ 이상)'
        END as label,
        COUNT(*)::integer as count,
        AVG(deal_or_warrant_prc_won)::numeric as avg_price
      FROM articles
      WHERE complex_id = ANY(${favoriteComplexIds})
        AND deal_or_warrant_prc_won > 0
      GROUP BY label
      ORDER BY 
        CASE label
          WHEN '소형 (59㎡ 이하)' THEN 1
          WHEN '중형 (60-84㎡)' THEN 2
          WHEN '대형 (85-135㎡)' THEN 3
          ELSE 4
        END
    `;

    const areaAnalysis = areaAnalysisRaw.map(bucket => ({
      label: bucket.label,
      count: bucket.count,
      avgPrice: Number(bucket.avg_price || 0),
      avgPriceFormatted: formatPriceFromWon(Number(bucket.avg_price || 0)),
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
          avgPriceFormatted: formatPriceFromWon(avgPrice),
          minPriceFormatted: formatPriceFromWon(minPrice),
          maxPriceFormatted: formatPriceFromWon(maxPrice),
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
