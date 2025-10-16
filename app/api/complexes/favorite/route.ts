import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import fs from 'fs/promises';
import path from 'path';

// favorites.json 경로 - /api/favorites와 동일한 경로 사용
const getFavoritesPath = () => {
  const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
  return path.join(baseDir, 'crawled_data', 'favorites.json');
};
const favoritesPath = getFavoritesPath();

// favorites.json 읽기
async function readFavorites() {
  try {
    const data = await fs.readFile(favoritesPath, 'utf-8');
    const parsed = JSON.parse(data);
    // /api/favorites와 동일하게 favorites 배열 반환
    return parsed.favorites || parsed || [];
  } catch (error) {
    return [];
  }
}

// favorites.json 쓰기
async function writeFavorites(favorites: any[]) {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = path.dirname(favoritesPath);
    await fs.mkdir(dataDir, { recursive: true });
    // /api/favorites와 동일하게 {favorites: []} 형식으로 저장
    await fs.writeFile(favoritesPath, JSON.stringify({ favorites }, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write favorites.json:', error);
    throw error;
  }
}

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

      // favorites.json에서 제거
      const favorites = await readFavorites();
      console.log('[FAVORITE_TOGGLE] favorites.json 읽기 완료:', { count: favorites.length });

      const filtered = favorites.filter((f: any) => f.complexNo !== complexNo);
      console.log('[FAVORITE_TOGGLE] 필터링 후:', {
        before: favorites.length,
        after: filtered.length,
        removed: favorites.length - filtered.length
      });

      const reordered = filtered.map((fav: any, index: number) => ({
        ...fav,
        order: index
      }));
      await writeFavorites(reordered);
      console.log('[FAVORITE_TOGGLE] favorites.json 쓰기 완료:', { finalCount: reordered.length });

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

      // favorites.json에 추가
      const favorites = await readFavorites();
      console.log('[FAVORITE_TOGGLE] favorites.json 읽기 완료:', { count: favorites.length });

      const newFavorite = {
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        addedAt: new Date().toISOString(),
        order: favorites.length,
        articleCount: complex._count.articles,
      };
      favorites.push(newFavorite);
      console.log('[FAVORITE_TOGGLE] favorites.json에 추가:', {
        newFavorite,
        newCount: favorites.length
      });

      await writeFavorites(favorites);
      console.log('[FAVORITE_TOGGLE] favorites.json 쓰기 완료');

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
