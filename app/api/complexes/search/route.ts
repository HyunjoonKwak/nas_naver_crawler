import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const normalizedQuery = query.trim();

    // 단지명, 주소, 법정동, 행정동에서 검색
    const complexes = await prisma.complex.findMany({
      where: {
        OR: [
          { complexName: { contains: normalizedQuery, mode: 'insensitive' } },
          { address: { contains: normalizedQuery, mode: 'insensitive' } },
          { beopjungdong: { contains: normalizedQuery, mode: 'insensitive' } },
          { haengjeongdong: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      },
      take: 20, // 최대 20개 결과
      orderBy: [
        { complexName: 'asc' }, // 가나다순 정렬
      ],
    });

    // 결과를 타입별로 분류하고 포맷팅
    const results = complexes.flatMap((complex) => {
      const items = [];

      // 1. 단지명으로 매칭된 경우
      if (complex.complexName.toLowerCase().includes(normalizedQuery.toLowerCase())) {
        items.push({
          type: 'complex' as const,
          id: complex.complexNo,
          title: complex.complexName,
          subtitle: complex.address || '',
          url: `/complex/${complex.complexNo}`,
        });
      }

      // 2. 주소로 매칭된 경우
      if (complex.address?.toLowerCase().includes(normalizedQuery.toLowerCase())) {
        items.push({
          type: 'address' as const,
          id: `${complex.complexNo}-address`,
          title: complex.address,
          subtitle: complex.complexName,
          url: `/complex/${complex.complexNo}`,
        });
      }

      // 3. 법정동/행정동으로 매칭된 경우
      if (
        complex.beopjungdong?.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
        complex.haengjeongdong?.toLowerCase().includes(normalizedQuery.toLowerCase())
      ) {
        const dong = complex.beopjungdong || complex.haengjeongdong;
        items.push({
          type: 'region' as const,
          id: `${complex.complexNo}-region`,
          title: dong || '',
          subtitle: `${complex.complexName} (${complex.address})`,
          url: `/complex/${complex.complexNo}`,
        });
      }

      return items;
    });

    // 중복 제거 (같은 URL을 가진 항목)
    const uniqueResults = results.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
    );

    return NextResponse.json({ results: uniqueResults.slice(0, 20) });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}
