import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getComplexWhereCondition } from '@/lib/auth-utils';
import { calculatePriceStats, calculateTradeTypeStats } from '@/lib/price-utils';

export const dynamic = 'force-dynamic';

// 단지 목록 조회 및 검색
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);

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

    // 단지 조회 (현재 사용자의 즐겨찾기 및 그룹만 포함)
    const complexes = await prisma.complex.findMany({
      where,
      include: {
        _count: {
          select: {
            articles: true, // 매물 개수
          },
        },
        articles: {
          orderBy: { createdAt: 'desc' },
          take: 100, // 최근 100개 매물 (가격 통계용)
          select: {
            createdAt: true,
            dealOrWarrantPrc: true,
            rentPrc: true,
            tradeTypeName: true,
          },
        },
        favorites: {
          where: {
            userId: currentUser.id, // 본인의 즐겨찾기만 조회
          },
          select: {
            id: true,
          },
        },
        complexGroups: {
          where: {
            group: {
              userId: currentUser.id, // 본인의 그룹만 조회 (완전 독립 정책)
            },
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        }
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    // 총 개수
    const total = await prisma.complex.count({ where });

    // 응답 포맷팅
    const results = complexes.map((complex: any) => {
      // 가격 통계 계산
      const priceStats = calculatePriceStats(complex.articles || []);
      const tradeTypeStats = calculateTradeTypeStats(complex.articles || []);

      // 24시간 매물 변동 계산
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const articlesIn24Hours = complex.articles?.filter((article: any) =>
        new Date(article.createdAt) >= twentyFourHoursAgo
      ).length || 0;

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
        articleCount: complex._count?.articles || 0,
        // DB Favorite 테이블 사용 (사용자별 즐겨찾기)
        isFavorite: complex.favorites.length > 0,
        // 그룹 정보 추가
        groups: complex.complexGroups?.map((cg: any) => ({
          id: cg.group.id,
          name: cg.group.name,
          color: cg.group.color
        })) || [],
        // 가격 통계
        priceStats: priceStats ? {
          avgPrice: priceStats.avgPriceFormatted,
          minPrice: priceStats.minPriceFormatted,
          maxPrice: priceStats.maxPriceFormatted,
        } : null,
        // 거래 유형별 통계
        tradeTypeStats: tradeTypeStats.map(stat => ({
          type: stat.tradeTypeName,
          count: stat.count,
          avgPrice: stat.priceStats?.avgPriceFormatted || '-',
        })),
        createdAt: complex.createdAt.toISOString(),
        updatedAt: complex.updatedAt.toISOString(),
        // 최근 수집일 (가장 최근 매물의 생성일)
        lastCrawledAt: complex.articles?.[0]?.createdAt?.toISOString() || null,
        // 24시간 매물 변동
        articleChange24h: articlesIn24Hours,
      };
    });

    return NextResponse.json({
      complexes: results,
      total,
      limit,
      offset,
    });

  } catch (error: any) {
    console.error('Complexes fetch error:', error);
    return NextResponse.json(
      { error: '단지 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
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
