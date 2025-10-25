import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = (session.user as any).id;

    // 최근 활동 조합: 크롤링 히스토리, 즐겨찾기 추가/삭제
    const activities = [];

    // 1. 최근 크롤링 히스토리
    const recentCrawls = await prisma.crawlHistory.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 5),
    });

    activities.push(
      ...recentCrawls.map((crawl) => ({
        id: `crawl-${crawl.id}`,
        type: 'crawl' as const,
        title: '크롤링 완료',
        description: `${crawl.totalComplexes}개 단지, ${crawl.totalArticles}개 매물 수집`,
        timestamp: crawl.createdAt.toISOString(),
      }))
    );

    // 2. 최근 즐겨찾기 추가
    const recentFavorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        complex: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 5),
    });

    activities.push(
      ...recentFavorites.map((fav) => ({
        id: `favorite-${fav.id}`,
        type: 'favorite' as const,
        title: '즐겨찾기 추가',
        description: fav.complex?.complexName || fav.complexId,
        timestamp: fav.createdAt.toISOString(),
      }))
    );

    // 타임스탬프로 정렬하고 limit 적용
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({ activities: sortedActivities });
  } catch (error: any) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities', activities: [] },
      { status: 500 }
    );
  }
}
