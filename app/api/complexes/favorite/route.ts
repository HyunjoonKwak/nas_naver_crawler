import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

// favorites.json 경로
const favoritesPath = path.join(process.cwd(), 'data', 'favorites.json');

// favorites.json 읽기
async function readFavorites() {
  try {
    const data = await fs.readFile(favoritesPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// favorites.json 쓰기
async function writeFavorites(favorites: any[]) {
  await fs.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
}

/**
 * POST /api/complexes/favorite
 * 관심단지 등록/해제 토글
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { complexNo } = body;

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. DB에서 단지 찾기
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      include: {
        favorites: true,
        _count: {
          select: { articles: true }
        }
      }
    });

    if (!complex) {
      return NextResponse.json(
        { error: '단지를 찾을 수 없습니다. 먼저 크롤링을 실행해주세요.' },
        { status: 404 }
      );
    }

    // 2. 현재 관심단지 여부 확인
    const isFavorite = complex.favorites.length > 0;

    if (isFavorite) {
      // 관심단지 해제
      // DB에서 Favorite 삭제
      await prisma.favorite.deleteMany({
        where: { complexId: complex.id }
      });

      // favorites.json에서 제거
      const favorites = await readFavorites();
      const filtered = favorites.filter((f: any) => f.complexNo !== complexNo);
      const reordered = filtered.map((fav: any, index: number) => ({
        ...fav,
        order: index
      }));
      await writeFavorites(reordered);

      return NextResponse.json({
        success: true,
        isFavorite: false,
        message: '관심단지에서 제거되었습니다.',
      });
    } else {
      // 관심단지 등록
      // DB에 Favorite 추가
      await prisma.favorite.create({
        data: {
          complexId: complex.id
        }
      });

      // favorites.json에 추가
      const favorites = await readFavorites();
      const newFavorite = {
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        addedAt: new Date().toISOString(),
        order: favorites.length,
        articleCount: complex._count.articles,
      };
      favorites.push(newFavorite);
      await writeFavorites(favorites);

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
