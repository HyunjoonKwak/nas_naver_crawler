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

    const complexes = await prisma.complex.findMany({
      where: {
        userId: currentUser.id
      },
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
        createdAt: 'desc'
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
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        isFavorite, // 관심단지 여부
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
