import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    return NextResponse.json({
      crawler: {
        scriptExists: crawlerExists,
        playwrightReady: playwrightReady,
        ready: crawlerExists && playwrightReady,
      },
      data: {
        crawledFilesCount: crawledDataCount,
      },
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

