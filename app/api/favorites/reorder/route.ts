import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const favoritesFilePath = path.join(process.cwd(), 'crawled_data', 'favorites.json');

interface FavoriteComplex {
  complexNo: string;
  complexName?: string;
  addedAt: string;
  lastCrawledAt?: string;
  articleCount?: number;
  totalHouseHoldCount?: number;
  totalDongCount?: number;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  order?: number;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { favorites } = body;

    if (!Array.isArray(favorites)) {
      return NextResponse.json(
        { error: 'favorites must be an array' },
        { status: 400 }
      );
    }

    // 기존 favorites 파일 읽기
    let existingFavorites: FavoriteComplex[] = [];
    try {
      const fileContent = await fs.readFile(favoritesFilePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      // favorites.json 파일 구조가 { favorites: [...] } 형태인 경우 처리
      existingFavorites = Array.isArray(parsed) ? parsed : (parsed.favorites || []);
    } catch (error) {
      // 파일이 없으면 빈 배열로 시작
      existingFavorites = [];
    }

    // 순서 정보만 업데이트 (다른 데이터는 유지)
    const updatedFavorites = favorites.map((fav: FavoriteComplex, index: number) => {
      const existing = existingFavorites.find(f => f.complexNo === fav.complexNo);
      return {
        ...(existing || fav),
        order: index
      };
    });

    // 파일에 저장 (기존 포맷 유지)
    await fs.writeFile(
      favoritesFilePath,
      JSON.stringify({ favorites: updatedFavorites }, null, 2),
      'utf-8'
    );

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      favorites: updatedFavorites
    });
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
