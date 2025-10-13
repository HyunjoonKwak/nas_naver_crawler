import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 모든 크롤링 히스토리를 최신순으로 조회
    const history = await prisma.crawlHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // 최근 100개만 조회
    });

    return NextResponse.json({
      history,
      total: history.length,
    });
  } catch (error: any) {
    console.error('Error fetching crawl history:', error);
    return NextResponse.json(
      {
        error: '크롤링 히스토리 조회 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
