import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Docker 이미지 확인
    let dockerImageExists = false;
    try {
      const { stdout } = await execAsync('docker images naver-crawler:latest -q');
      dockerImageExists = stdout.trim().length > 0;
    } catch {
      dockerImageExists = false;
    }

    // 실행 중인 컨테이너 확인
    let runningContainers: string[] = [];
    try {
      const { stdout } = await execAsync('docker ps --filter "ancestor=naver-crawler:latest" --format "{{.Names}}"');
      runningContainers = stdout.trim().split('\n').filter(Boolean);
    } catch {
      runningContainers = [];
    }

    // 크롤링된 데이터 개수 확인
    let crawledDataCount = 0;
    try {
      const { stdout } = await execAsync('ls -1 crawled_data/*.json 2>/dev/null | wc -l');
      crawledDataCount = parseInt(stdout.trim()) || 0;
    } catch {
      crawledDataCount = 0;
    }

    return NextResponse.json({
      docker: {
        imageExists: dockerImageExists,
        runningContainers: runningContainers.length,
        containerNames: runningContainers,
      },
      data: {
        crawledFilesCount: crawledDataCount,
      },
      status: dockerImageExists ? 'ready' : 'not_ready',
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

