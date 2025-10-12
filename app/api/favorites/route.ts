import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FAVORITES_FILE = 'favorites.json';

interface FavoriteComplex {
  complexNo: string;
  complexName?: string;
  addedAt: string;
  lastCrawledAt?: string;
  articleCount?: number;
  // 크롤링 데이터가 있을 때 추가 정보
  totalHouseHoldCount?: number;
  totalDongCount?: number;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  order?: number;
}

// 선호 단지 파일 경로
const getFavoritesPath = () => {
  const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
  return path.join(baseDir, 'crawled_data', FAVORITES_FILE);
};

// 선호 단지 읽기
const readFavorites = async (): Promise<FavoriteComplex[]> => {
  try {
    const filePath = getFavoritesPath();
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data.favorites || [];
  } catch {
    return [];
  }
};

// 선호 단지 저장
const writeFavorites = async (favorites: FavoriteComplex[]) => {
  const filePath = getFavoritesPath();
  const dirPath = path.dirname(filePath);
  
  // 디렉토리가 없으면 생성
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
  
  await fs.writeFile(filePath, JSON.stringify({ favorites }, null, 2), 'utf-8');
};

export const dynamic = 'force-dynamic';

// GET: 선호 단지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const favorites = await readFavorites();

    // order 필드로 정렬 (없으면 addedAt으로)
    const sortedFavorites = favorites.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // order가 없으면 추가된 순서대로
      return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
    });

    return NextResponse.json({
      favorites: sortedFavorites,
      total: sortedFavorites.length
    });
  } catch (error: any) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json(
      { error: '선호 단지 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 선호 단지 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { complexNo, complexName } = body;
    
    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }
    
    const favorites = await readFavorites();
    
    // 중복 확인
    if (favorites.some(f => f.complexNo === complexNo)) {
      return NextResponse.json(
        { error: '이미 등록된 단지입니다.' },
        { status: 400 }
      );
    }
    
    // 새 단지 추가 (order는 배열 끝으로)
    const newFavorite: FavoriteComplex = {
      complexNo,
      complexName: complexName || `단지 ${complexNo}`,
      addedAt: new Date().toISOString(),
      order: favorites.length, // 현재 길이를 order로 설정
    };

    favorites.push(newFavorite);
    await writeFavorites(favorites);
    
    return NextResponse.json({
      success: true,
      message: '선호 단지가 추가되었습니다.',
      favorite: newFavorite
    });
    
  } catch (error: any) {
    console.error('Favorite add error:', error);
    return NextResponse.json(
      { error: '선호 단지 추가 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 선호 단지 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const complexNo = searchParams.get('complexNo');
    
    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }
    
    const favorites = await readFavorites();
    const filtered = favorites.filter(f => f.complexNo !== complexNo);

    if (filtered.length === favorites.length) {
      return NextResponse.json(
        { error: '해당 단지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // order 재정렬
    const reordered = filtered.map((fav, index) => ({
      ...fav,
      order: index
    }));

    await writeFavorites(reordered);
    
    return NextResponse.json({
      success: true,
      message: '선호 단지가 삭제되었습니다.',
      complexNo
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
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      complexNo,
      complexName,
      articleCount,
      totalHouseHoldCount,
      totalDongCount,
      minArea,
      maxArea,
      minPrice,
      maxPrice
    } = body;

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    const favorites = await readFavorites();
    const index = favorites.findIndex(f => f.complexNo === complexNo);

    if (index === -1) {
      return NextResponse.json(
        { error: '해당 단지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 정보 업데이트
    if (complexName) favorites[index].complexName = complexName;
    if (articleCount !== undefined) favorites[index].articleCount = articleCount;
    if (totalHouseHoldCount !== undefined) favorites[index].totalHouseHoldCount = totalHouseHoldCount;
    if (totalDongCount !== undefined) favorites[index].totalDongCount = totalDongCount;
    if (minArea !== undefined) favorites[index].minArea = minArea;
    if (maxArea !== undefined) favorites[index].maxArea = maxArea;
    if (minPrice !== undefined) favorites[index].minPrice = minPrice;
    if (maxPrice !== undefined) favorites[index].maxPrice = maxPrice;
    favorites[index].lastCrawledAt = new Date().toISOString();

    await writeFavorites(favorites);
    
    return NextResponse.json({
      success: true,
      message: '선호 단지 정보가 업데이트되었습니다.',
      favorite: favorites[index]
    });
    
  } catch (error: any) {
    console.error('Favorite update error:', error);
    return NextResponse.json(
      { error: '선호 단지 정보 업데이트 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

