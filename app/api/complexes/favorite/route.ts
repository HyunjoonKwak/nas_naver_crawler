import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * POST /api/complexes/favorite
 * 관심단지 등록/해제 토글
 */
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const body = await request.json();
    const { complexNo } = body;

    console.log('[FAVORITE_TOGGLE] 요청 시작:', { complexNo, userId: currentUser.id });

    if (!complexNo) {
      console.log('[FAVORITE_TOGGLE] 에러: 단지번호 누락');
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. DB에서 단지 찾기
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      include: {
        favorites: {
          where: {
            userId: currentUser.id, // 본인 즐겨찾기만 확인
          },
        },
        _count: {
          select: { articles: true }
        }
      }
    });

    console.log('[FAVORITE_TOGGLE] DB 조회 결과:', {
      found: !!complex,
      complexNo,
      complexName: complex?.complexName,
      favoritesCount: complex?.favorites.length,
      articlesCount: complex?._count.articles
    });

    if (!complex) {
      console.log('[FAVORITE_TOGGLE] 에러: 단지를 찾을 수 없음');
      return NextResponse.json(
        { error: '단지를 찾을 수 없습니다. 먼저 크롤링을 실행해주세요.' },
        { status: 404 }
      );
    }

    // 2. 현재 관심단지 여부 확인
    const isFavorite = complex.favorites.length > 0;
    console.log('[FAVORITE_TOGGLE] 현재 상태:', { isFavorite, action: isFavorite ? '해제' : '등록' });

    if (isFavorite) {
      // 관심단지 해제
      console.log('[FAVORITE_TOGGLE] 관심단지 해제 시작');

      // DB에서 Favorite 삭제 (본인 것만)
      await prisma.favorite.deleteMany({
        where: {
          complexId: complex.id,
          userId: currentUser.id,
        }
      });
      console.log('[FAVORITE_TOGGLE] DB에서 Favorite 삭제 완료');

      return NextResponse.json({
        success: true,
        isFavorite: false,
        message: '관심단지에서 제거되었습니다.',
      });
    } else {
      // 관심단지 등록
      console.log('[FAVORITE_TOGGLE] 관심단지 등록 시작');

      // DB에 Favorite 추가
      await prisma.favorite.create({
        data: {
          complexId: complex.id,
          userId: currentUser.id,
        }
      });
      console.log('[FAVORITE_TOGGLE] DB에 Favorite 추가 완료');

      return NextResponse.json({
        success: true,
        isFavorite: true,
        message: '관심단지에 등록되었습니다.',
      });
    }

  } catch (error: any) {
    console.error('Favorite toggle error:', error);
    return NextResponse.json(
      { error: '관심단지 설정 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
