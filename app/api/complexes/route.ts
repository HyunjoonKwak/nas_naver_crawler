import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getComplexWhereCondition } from '@/lib/auth-utils';
import { getCached, CacheKeys, CacheTTL } from '@/lib/redis-cache';
import { formatPriceFromWon } from '@/lib/price-utils';

export const dynamic = 'force-dynamic';

// 단지 목록 조회 및 검색
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    
    // ✅ 캐싱 적용 (5분 캐시) - 데이터만 캐싱, Response는 항상 새로 생성
    const cacheKey = CacheKeys.complex.list(currentUser.id, searchParams.toString());

    const data = await getCached(
      cacheKey,
      CacheTTL.medium,
      async () => {
        return await fetchComplexListData(currentUser, searchParams);
      }
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Complexes fetch error:', error);
    return NextResponse.json(
      { error: '단지 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// ✅ 리팩토링: 캐싱을 위해 로직 분리 (데이터만 반환, Response 객체 반환 안함)
async function fetchComplexListData(currentUser: any, searchParams: URLSearchParams) {
  try {

    // 쿼리 파라미터
    const search = searchParams.get('search'); // 단지명 또는 주소 검색
    const groupId = searchParams.get('groupId'); // 그룹 필터
    const sortBy = searchParams.get('sortBy') || 'updatedAt'; // 정렬 기준
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 정렬 순서
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // WHERE 조건 구성 (사용자 권한 기반 필터링)
    const where: any = await getComplexWhereCondition(currentUser);

    if (search) {
      where.OR = [
        { complexName: { contains: search } },
        { address: { contains: search } },
        { roadAddress: { contains: search } },
        { beopjungdong: { contains: search } },
        { haengjeongdong: { contains: search } },
      ];
    }

    // 그룹 필터링
    if (groupId && groupId !== 'all') {
      where.complexGroups = {
        some: {
          groupId: groupId
        }
      };
    }

    // 정렬 조건 구성
    let orderBy: any = {};
    switch (sortBy) {
      case 'name':
        orderBy = { complexName: sortOrder };
        break;
      case 'region':
        orderBy = { beopjungdong: sortOrder };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortOrder };
        break;
      case 'complexNo':
        orderBy = { complexNo: sortOrder };
        break;
      case 'updatedAt':
      default:
        orderBy = { updatedAt: sortOrder };
        break;
    }

    // ✅ 개선: 단지 기본 정보만 조회 (N+1 방지)
    const complexes = await prisma.complex.findMany({
      where,
      select: {
        id: true,
        complexNo: true,
        complexName: true,
        totalHousehold: true,
        totalDong: true,
        latitude: true,
        longitude: true,
        address: true,
        roadAddress: true,
        jibunAddress: true,
        beopjungdong: true,
        haengjeongdong: true,
        lawdCd: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { articles: true }
        },
        favorites: {
          where: { userId: currentUser.id },
          select: { id: true }
        },
        complexGroups: {
          where: {
            group: { userId: currentUser.id }
          },
          include: {
            group: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    const complexIds = complexes.map(c => c.id);

    // 총 개수
    const total = await prisma.complex.count({ where });

    // ✅ 개선: 가격 통계 (DB 집계 - 숫자 컬럼 사용!)
    const priceStats = await prisma.article.groupBy({
      by: ['complexId'],
      where: {
        complexId: { in: complexIds },
        dealOrWarrantPrcWon: { gt: 0 }
      },
      _avg: { dealOrWarrantPrcWon: true },
      _min: { dealOrWarrantPrcWon: true },
      _max: { dealOrWarrantPrcWon: true },
    });

    // ✅ 개선: 거래 유형별 통계 (DB 집계)
    const tradeTypeStats = await prisma.article.groupBy({
      by: ['complexId', 'tradeTypeName'],
      where: {
        complexId: { in: complexIds },
        dealOrWarrantPrcWon: { gt: 0 }
      },
      _count: true,
      _avg: { dealOrWarrantPrcWon: true },
    });

    // ✅ 개선: 24시간 매물 변동 (DB 쿼리)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCounts = await prisma.article.groupBy({
      by: ['complexId'],
      where: {
        complexId: { in: complexIds },
        createdAt: { gte: twentyFourHoursAgo }
      },
      _count: true,
    });

    // ✅ 개선: 최근 수집일 (단일 쿼리)
    const lastCrawled = await prisma.article.groupBy({
      by: ['complexId'],
      where: { complexId: { in: complexIds } },
      _max: { createdAt: true },
    });

    // ✅ 개선: 결과 조합 (메모리 효율적)
    const results = complexes.map((complex: any) => {
      const stats = priceStats.find(s => s.complexId === complex.id);
      const trades = tradeTypeStats
        .filter(t => t.complexId === complex.id)
        .map(t => ({
          type: t.tradeTypeName,
          count: t._count,
          avgPrice: formatPriceFromWon(
            t._avg.dealOrWarrantPrcWon ? BigInt(Math.floor(t._avg.dealOrWarrantPrcWon)) : null
          ),
        }));
      const recentCount = recentCounts.find(r => r.complexId === complex.id)?._count || 0;
      const lastCrawl = lastCrawled.find(l => l.complexId === complex.id)?._max.createdAt;

      return {
        id: complex.id,
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        totalHousehold: complex.totalHousehold,
        totalDong: complex.totalDong,
        location: {
          latitude: complex.latitude,
          longitude: complex.longitude,
        },
        address: complex.address,
        roadAddress: complex.roadAddress,
        jibunAddress: complex.jibunAddress,
        beopjungdong: complex.beopjungdong,
        haengjeongdong: complex.haengjeongdong,
        lawdCd: complex.lawdCd,
        articleCount: complex._count?.articles || 0,
        isFavorite: complex.favorites.length > 0,
        groups: complex.complexGroups?.map((cg: any) => ({
          id: cg.group.id,
          name: cg.group.name,
          color: cg.group.color
        })) || [],
        priceStats: stats ? {
          avgPrice: formatPriceFromWon(
            stats._avg.dealOrWarrantPrcWon ? BigInt(Math.floor(stats._avg.dealOrWarrantPrcWon)) : null
          ),
          minPrice: formatPriceFromWon(
            stats._min.dealOrWarrantPrcWon ? BigInt(stats._min.dealOrWarrantPrcWon) : null
          ),
          maxPrice: formatPriceFromWon(
            stats._max.dealOrWarrantPrcWon ? BigInt(stats._max.dealOrWarrantPrcWon) : null
          ),
        } : null,
        tradeTypeStats: trades,
        createdAt: complex.createdAt.toISOString(),
        updatedAt: complex.updatedAt.toISOString(),
        lastCrawledAt: lastCrawl?.toISOString() || null,
        articleChange24h: recentCount,
      };
    });

    return {
      complexes: results,
      total,
      limit,
      offset,
    };
  } catch (error: any) {
    throw error;
  }
}

// 특정 단지 상세 조회
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const body = await request.json();
    const { complexNo } = body;

    if (!complexNo) {
      return NextResponse.json(
        { error: 'complexNo가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자 권한 기반 where 조건
    const userWhereCondition = await getComplexWhereCondition(currentUser);

    // 단지 조회 (권한 체크 포함)
    const complex = await prisma.complex.findFirst({
      where: {
        complexNo,
        ...userWhereCondition,
      },
      include: {
        articles: {
          orderBy: { createdAt: 'desc' },
          take: 100, // 최근 100개 매물
        },
        favorites: true,
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!complex) {
      return NextResponse.json(
        { error: '단지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 매물 통계
    const articleStats = {
      total: complex._count.articles,
      byTradeType: await prisma.article.groupBy({
        by: ['tradeTypeName'],
        where: { complexId: complex.id },
        _count: true,
      }),
    };

    return NextResponse.json({
      complex: {
        id: complex.id,
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        totalHousehold: complex.totalHousehold,
        totalDong: complex.totalDong,
        location: {
          latitude: complex.latitude,
          longitude: complex.longitude,
        },
        address: complex.address,
        roadAddress: complex.roadAddress,
        jibunAddress: complex.jibunAddress,
        beopjungdong: complex.beopjungdong,
        haengjeongdong: complex.haengjeongdong,
        isFavorite: complex.favorites.length > 0,
        createdAt: complex.createdAt.toISOString(),
        updatedAt: complex.updatedAt.toISOString(),
      },
      articles: complex.articles.map(article => ({
        articleNo: article.articleNo,
        realEstateTypeName: article.realEstateTypeName,
        tradeTypeName: article.tradeTypeName,
        dealOrWarrantPrc: article.dealOrWarrantPrc,
        rentPrc: article.rentPrc,
        area1: article.area1,
        area2: article.area2,
        floorInfo: article.floorInfo,
        direction: article.direction,
        articleConfirmYmd: article.articleConfirmYmd,
        tagList: article.tagList,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
      })),
      stats: articleStats,
    });

  } catch (error: any) {
    console.error('Complex detail fetch error:', error);
    return NextResponse.json(
      { error: '단지 상세 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
