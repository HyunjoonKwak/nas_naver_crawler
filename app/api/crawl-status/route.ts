import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const crawlId = searchParams.get('crawlId');

    if (crawlId) {
      // 특정 크롤링 작업의 상태 조회
      const crawlHistory = await prisma.crawlHistory.findUnique({
        where: { id: crawlId },
      });

      if (!crawlHistory) {
        return NextResponse.json(
          { error: '크롤링 작업을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 진행률 계산
      const progress = {
        currentStep: crawlHistory.currentStep || 'Unknown',
        processedComplexes: crawlHistory.processedComplexes,
        totalComplexes: crawlHistory.totalComplexes,
        processedArticles: crawlHistory.processedArticles,
        totalArticles: crawlHistory.totalArticles,
        complexProgress: crawlHistory.totalComplexes > 0
          ? Math.round((crawlHistory.processedComplexes / crawlHistory.totalComplexes) * 100)
          : 0,
      };

      return NextResponse.json({
        crawlId: crawlHistory.id,
        status: crawlHistory.status,
        progress,
        duration: crawlHistory.duration,
        errorMessage: crawlHistory.errorMessage,
        createdAt: crawlHistory.createdAt,
        updatedAt: crawlHistory.updatedAt,
      });
    } else {
      // 가장 최근 크롤링 작업 조회
      const latestCrawl = await prisma.crawlHistory.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!latestCrawl) {
        return NextResponse.json({
          found: false,
          message: '크롤링 기록이 없습니다.',
        });
      }

      // 진행률 계산
      const progress = {
        currentStep: latestCrawl.currentStep || 'Unknown',
        processedComplexes: latestCrawl.processedComplexes,
        totalComplexes: latestCrawl.totalComplexes,
        processedArticles: latestCrawl.processedArticles,
        totalArticles: latestCrawl.totalArticles,
        complexProgress: latestCrawl.totalComplexes > 0
          ? Math.round((latestCrawl.processedComplexes / latestCrawl.totalComplexes) * 100)
          : 0,
      };

      return NextResponse.json({
        found: true,
        crawlId: latestCrawl.id,
        status: latestCrawl.status,
        progress,
        duration: latestCrawl.duration,
        errorMessage: latestCrawl.errorMessage,
        createdAt: latestCrawl.createdAt,
        updatedAt: latestCrawl.updatedAt,
      });
    }
  } catch (error: any) {
    console.error('Error reading crawl status:', error);
    return NextResponse.json(
      {
        error: '크롤 상태 조회 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
