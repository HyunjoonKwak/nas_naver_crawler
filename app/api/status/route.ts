import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 인증 확인 (선택적 - 실패해도 계속 진행)
    let isAuthenticated = false;
    try {
      await requireAuth();
      isAuthenticated = true;
    } catch (error) {
      // 인증 실패 시 기본 정보만 제공
      isAuthenticated = false;
    }

    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    
    // Python 크롤러 존재 확인
    let crawlerExists = false;
    try {
      const { stdout } = await execAsync(`test -f ${baseDir}/logic/nas_playwright_crawler.py && echo "exists"`);
      crawlerExists = stdout.trim() === 'exists';
    } catch {
      crawlerExists = false;
    }

    // Playwright 설치 확인
    let playwrightReady = false;
    try {
      const { stdout } = await execAsync('python3 -c "import playwright; print(\'ready\')"');
      playwrightReady = stdout.trim() === 'ready';
    } catch {
      playwrightReady = false;
    }

    // 크롤링된 데이터 개수 확인
    let crawledDataCount = 0;
    try {
      const { stdout } = await execAsync(`ls -1 ${baseDir}/crawled_data/*.json 2>/dev/null | wc -l`);
      crawledDataCount = parseInt(stdout.trim()) || 0;
    } catch {
      crawledDataCount = 0;
    }

    // 선호 단지 개수 확인 (DB에서 조회)
    let favoritesCount = 0;
    try {
      favoritesCount = await prisma.favorite.count();
    } catch {
      favoritesCount = 0;
    }

    // 디스크 사용량 확인
    let crawledDataSize = '0 B';
    try {
      const { stdout } = await execAsync(`du -sh ${baseDir}/crawled_data 2>/dev/null | awk '{print $1}'`);
      crawledDataSize = stdout.trim() || '0 B';
    } catch {
      crawledDataSize = '0 B';
    }

    // 현재 진행 중인 크롤링 확인
    let currentCrawl = null;
    try {
      const ongoingCrawl = await prisma.crawlHistory.findFirst({
        where: {
          status: 'crawling',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (ongoingCrawl) {
        // 진행률 계산
        const progress = ongoingCrawl.totalComplexes > 0
          ? Math.round((ongoingCrawl.processedComplexes / ongoingCrawl.totalComplexes) * 100)
          : 0;

        currentCrawl = {
          id: ongoingCrawl.id,
          status: ongoingCrawl.status,
          currentStep: ongoingCrawl.currentStep,
          progress,
          processedComplexes: ongoingCrawl.processedComplexes,
          totalComplexes: ongoingCrawl.totalComplexes,
          processedArticles: ongoingCrawl.processedArticles,
        };
      }
    } catch (error) {
      console.error('Failed to fetch current crawl:', error);
    }

    return NextResponse.json({
      isAuthenticated,
      crawler: {
        scriptExists: crawlerExists,
        playwrightReady: playwrightReady,
        ready: crawlerExists && playwrightReady,
      },
      data: {
        crawledFilesCount: crawledDataCount,
      },
      crawledDataCount,
      favoritesCount: isAuthenticated ? favoritesCount : null,
      crawledDataSize,
      status: (crawlerExists && playwrightReady) ? 'ready' : 'not_ready',
      currentCrawl: isAuthenticated ? currentCrawl : null, // 인증된 사용자만 크롤링 정보 제공
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

