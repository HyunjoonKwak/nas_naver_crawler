import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

    // 크롤링된 데이터 개수 확인 (favorites.json 제외)
    let crawledDataCount = 0;
    try {
      const { stdout } = await execAsync(`ls -1 ${baseDir}/crawled_data/*.json 2>/dev/null | grep -v favorites.json | wc -l`);
      crawledDataCount = parseInt(stdout.trim()) || 0;
    } catch {
      crawledDataCount = 0;
    }

    // 선호 단지 개수 확인
    let favoritesCount = 0;
    try {
      const favoritesPath = path.join(baseDir, 'crawled_data', 'favorites.json');
      const fileContent = await fs.readFile(favoritesPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      const favorites = Array.isArray(parsed) ? parsed : (parsed.favorites || []);
      favoritesCount = favorites.length;
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

    return NextResponse.json({
      crawler: {
        scriptExists: crawlerExists,
        playwrightReady: playwrightReady,
        ready: crawlerExists && playwrightReady,
      },
      data: {
        crawledFilesCount: crawledDataCount,
      },
      crawledDataCount,
      favoritesCount,
      crawledDataSize,
      status: (crawlerExists && playwrightReady) ? 'ready' : 'not_ready',
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

