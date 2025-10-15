import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// favorites.json 읽기 함수
const readFavoritesJson = async (): Promise<Set<string>> => {
  try {
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const favoritesPath = path.join(baseDir, 'crawled_data', 'favorites.json');
    const content = await fs.readFile(favoritesPath, 'utf-8');
    const data = JSON.parse(content);
    const favoriteComplexNos = (data.favorites || []).map((f: any) => f.complexNo);
    return new Set(favoriteComplexNos);
  } catch {
    return new Set(); // 파일이 없으면 빈 Set 반환
  }
};

// 단지 목록 조회 및 검색
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const search = searchParams.get('search'); // 단지명 또는 주소 검색
    const groupId = searchParams.get('groupId'); // 그룹 필터
    const sortBy = searchParams.get('sortBy') || 'updatedAt'; // 정렬 기준
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 정렬 순서
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // WHERE 조건 구성
    const where: any = {};

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

    // 단지 조회
    const complexes = await prisma.complex.findMany({
      where,
      include: {
        _count: {
          select: {
            articles: true, // 매물 개수
            favorites: true, // 즐겨찾기 여부 (DB)
          },
        },
        complexGroups: {
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

    // favorites.json에서 즐겨찾기 목록 가져오기
    const favoriteComplexNos = await readFavoritesJson();

    // 응답 포맷팅
    const results = complexes.map((complex: any) => ({
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
      // favorites.json에만 의존 (DB Favorite 테이블은 관계형 데이터용)
      isFavorite: favoriteComplexNos.has(complex.complexNo),
      // 그룹 정보 추가
      groups: complex.complexGroups?.map((cg: any) => ({
        id: cg.group.id,
        name: cg.group.name,
        color: cg.group.color
      })) || [],
      createdAt: complex.createdAt.toISOString(),
      updatedAt: complex.updatedAt.toISOString(),
    }));

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
    const body = await request.json();
    const { complexNo } = body;

    if (!complexNo) {
      return NextResponse.json(
        { error: 'complexNo가 필요합니다.' },
        { status: 400 }
      );
    }

    // 단지 조회
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
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
