import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// POST: 단지 추가 (관심단지 X, Complex 테이블에만 추가)
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

    // 단지가 DB에 이미 있는지 확인
    let complex = await prisma.complex.findUnique({
      where: { complexNo }
    });

    // 이미 존재하는 경우
    if (complex) {
      return NextResponse.json(
        { error: '이미 등록된 단지입니다.' },
        { status: 400 }
      );
    }

    // Complex 테이블에만 추가 (Favorite에는 추가하지 않음)
    complex = await prisma.complex.create({
      data: {
        complexNo,
        complexName: complexName || `단지 ${complexNo}`,
        address: '',
        userId: currentUser.id,
      }
    });

    console.log('[API_COMPLEX] 단지 추가 완료 (관심단지 X):', {
      complexNo,
      complexName,
      userId: currentUser.id
    });

    // 캐시 무효화
    invalidateCache(`complexes:${currentUser.id}`);
    invalidateCache(`favorites:${currentUser.id}`);

    return NextResponse.json({
      success: true,
      complex: {
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        id: complex.id
      }
    });
  } catch (error: any) {
    console.error('[API_COMPLEX] POST error:', error);
    return NextResponse.json(
      { error: '단지 추가 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// GET: 모든 단지 조회 (사용자가 생성한 모든 단지)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    // 그룹 필터링을 위한 where 조건
    const whereCondition: any = {
      userId: currentUser.id
    };

    // 그룹 필터링이 있는 경우
    if (groupId) {
      whereCondition.complexGroups = {
        some: {
          groupId: groupId
        }
      };
    }

    const complexes = await prisma.complex.findMany({
      where: whereCondition,
      include: {
        articles: {
          select: {
            id: true,
            tradeTypeName: true,
          }
        },
        favorites: {
          where: {
            userId: currentUser.id
          }
        },
        complexGroups: {
          where: {
            group: {
              userId: currentUser.id
            }
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
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 응답 형태로 변환
    const formattedComplexes = complexes.map((complex) => {
      const articles = complex.articles || [];
      const isFavorite = complex.favorites.length > 0;

      // 거래 유형별 매물 수 계산
      const tradeTypeCount = articles.reduce((acc, article) => {
        const type = article.tradeTypeName || '기타';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        id: complex.id, // 그룹 관리에 필요
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        isFavorite, // 관심단지 여부
        createdAt: complex.createdAt?.toISOString(),
        updatedAt: complex.updatedAt.toISOString(),
        lastCrawledAt: complex.updatedAt.toISOString(),
        articleCount: articles.length,
        totalHouseHoldCount: complex.totalHousehold,
        totalDongCount: complex.totalDong,
        groups: complex.complexGroups?.map((cg: any) => ({
          id: cg.group.id,
          name: cg.group.name,
          color: cg.group.color
        })) || [],
        stats: {
          total: articles.length,
          A1: tradeTypeCount['매매'] || 0,
          B1: tradeTypeCount['전세'] || 0,
          B2: tradeTypeCount['월세'] || 0,
        }
      };
    });

    return NextResponse.json({
      complexes: formattedComplexes,
      total: formattedComplexes.length
    });
  } catch (error: any) {
    console.error('[API_COMPLEX] GET error:', error);
    return NextResponse.json(
      { error: '단지 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 단지 완전 삭제 (Complex 테이블에서 삭제, Cascade로 연관 데이터 모두 삭제)
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
      where: { complexNo },
      include: {
        _count: {
          select: {
            articles: true,
            favorites: true,
            complexGroups: true
          }
        }
      }
    });

    if (!complex) {
      return NextResponse.json(
        { error: '해당 단지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인: 본인이 생성한 단지만 삭제 가능
    if (complex.userId !== currentUser.id) {
      return NextResponse.json(
        { error: '본인이 생성한 단지만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    console.log('[API_COMPLEX] 단지 삭제 시작:', {
      complexNo,
      complexName: complex.complexName,
      userId: currentUser.id,
      연관데이터: {
        매물: complex._count.articles,
        관심단지: complex._count.favorites,
        그룹연결: complex._count.complexGroups
      }
    });

    // Complex 삭제 (Cascade로 연관 데이터 모두 삭제)
    // - articles (매물)
    // - favorites (관심단지)
    // - complexGroups (그룹 연결)
    await prisma.complex.delete({
      where: { id: complex.id }
    });

    console.log('[API_COMPLEX] 단지 삭제 완료:', {
      complexNo,
      complexName: complex.complexName
    });

    // 캐시 무효화
    invalidateCache(`complexes:${currentUser.id}`);
    invalidateCache(`favorites:${currentUser.id}`);

    return NextResponse.json({
      success: true,
      message: '단지가 완전히 삭제되었습니다.',
      complexNo,
      deletedData: {
        articles: complex._count.articles,
        favorites: complex._count.favorites,
        complexGroups: complex._count.complexGroups
      }
    });
  } catch (error: any) {
    console.error('[API_COMPLEX] DELETE error:', error);
    return NextResponse.json(
      { error: '단지 삭제 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
