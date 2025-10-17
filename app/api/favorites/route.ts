import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// GET: 선호 단지 목록 조회 (DB 기반, 사용자별 필터링)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    console.log('[API_FAVORITES] GET 요청 시작 - User:', currentUser.id);

    // 사용자가 접근 가능한 userId 목록 가져오기
    const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

    // DB에서 즐겨찾기 조회 (사용자 필터링)
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: { in: accessibleUserIds }
      },
      include: {
        complex: {
          include: {
            articles: {
              select: {
                id: true,
                tradeTypeName: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // 추가된 순서대로
      }
    });

    // 응답 형태로 변환
    const formattedFavorites = favorites.map((fav, index) => {
      const complex = fav.complex;
      const articles = complex.articles || [];

      // 거래 유형별 매물 수 계산
      const tradeTypeCount = articles.reduce((acc, article) => {
        const type = article.tradeTypeName || '기타';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        addedAt: fav.createdAt.toISOString(),
        lastCrawledAt: complex.updatedAt.toISOString(),
        articleCount: articles.length,
        totalHouseHoldCount: complex.totalHousehold,
        totalDongCount: complex.totalDongCount,
        minArea: complex.minArea,
        maxArea: complex.maxArea,
        minPrice: complex.minPrice,
        maxPrice: complex.maxPrice,
        order: index, // 순서
        stats: {
          total: articles.length,
          A1: tradeTypeCount['매매'] || 0,
          B1: tradeTypeCount['전세'] || 0,
          B2: tradeTypeCount['월세'] || 0,
        }
      };
    });

    return NextResponse.json({
      favorites: formattedFavorites,
      total: formattedFavorites.length
    });
  } catch (error: any) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json(
      { error: '선호 단지 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 선호 단지 추가 (DB 기반)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();
    const { complexNo, complexName } = body;

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 단지가 DB에 있는지 확인
    let complex = await prisma.complex.findUnique({
      where: { complexNo }
    });

    // 없으면 생성 (userId는 현재 사용자)
    if (!complex) {
      complex = await prisma.complex.create({
        data: {
          complexNo,
          complexName: complexName || `단지 ${complexNo}`,
          address: '',
          userId: currentUser.id,
        }
      });
    }

    // 이미 즐겨찾기에 있는지 확인
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        complexId_userId: {
          complexId: complex.id,
          userId: currentUser.id
        }
      }
    });

    if (existingFavorite) {
      return NextResponse.json(
        { error: '이미 등록된 단지입니다.' },
        { status: 400 }
      );
    }

    // 즐겨찾기 추가
    const favorite = await prisma.favorite.create({
      data: {
        complexId: complex.id,
        userId: currentUser.id,
      },
      include: {
        complex: true
      }
    });

    return NextResponse.json({
      success: true,
      message: '선호 단지가 추가되었습니다.',
      favorite: {
        complexNo: favorite.complex.complexNo,
        complexName: favorite.complex.complexName,
        addedAt: favorite.createdAt.toISOString(),
      }
    });

  } catch (error: any) {
    console.error('Favorite add error:', error);
    return NextResponse.json(
      { error: '선호 단지 추가 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 선호 단지 삭제 (DB 기반)
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const complexNo = searchParams.get('complexNo');

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 단지 찾기
    const complex = await prisma.complex.findUnique({
      where: { complexNo }
    });

    if (!complex) {
      return NextResponse.json(
        { error: '해당 단지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 즐겨찾기 삭제 (본인 것만)
    const deleted = await prisma.favorite.deleteMany({
      where: {
        complexId: complex.id,
        userId: currentUser.id
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: '즐겨찾기에 없는 단지입니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '선호 단지가 삭제되었습니다.',
      complexNo,
    });

  } catch (error: any) {
    console.error('Favorite delete error:', error);
    return NextResponse.json(
      { error: '선호 단지 삭제 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH: 선호 단지 정보 업데이트 (크롤링 후)
// 이제 DB에서 자동으로 업데이트되므로 필요 없지만 호환성을 위해 유지
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();
    const { complexNo } = body;

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 단지가 존재하는지만 확인
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      include: {
        favorites: {
          where: { userId: currentUser.id }
        }
      }
    });

    if (!complex || complex.favorites.length === 0) {
      return NextResponse.json(
        { error: '즐겨찾기에 없는 단지입니다.' },
        { status: 404 }
      );
    }

    // DB는 자동으로 updatedAt을 업데이트하므로 별도 작업 불필요
    return NextResponse.json({
      success: true,
      message: '선호 단지 정보가 업데이트되었습니다.',
    });

  } catch (error: any) {
    console.error('Favorite update error:', error);
    return NextResponse.json(
      { error: '선호 단지 정보 업데이트 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 관심 단지 순서 변경
// DB 기반에서는 createdAt으로 정렬되므로 순서 변경 기능 제거
// 호환성을 위해 API는 유지하되 아무 동작 안 함
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();

    return NextResponse.json({
      success: true,
      message: '순서 변경 기능은 더 이상 지원되지 않습니다.',
    });

  } catch (error: any) {
    console.error('Favorites reorder error:', error);
    return NextResponse.json(
      { error: '순서 변경 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
