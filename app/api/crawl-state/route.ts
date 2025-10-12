import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CRAWL_STATE_FILE = 'crawl_state.json';

interface CrawlState {
  isCrawling: boolean;
  startTime?: string;
  complexCount?: number;
  currentComplex?: string;
  lastUpdated: string;
}

// 크롤 상태 파일 경로
const getStatePath = () => {
  const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
  return path.join(baseDir, 'crawled_data', CRAWL_STATE_FILE);
};

// 크롤 상태 읽기
const readCrawlState = async (): Promise<CrawlState | null> => {
  try {
    const filePath = getStatePath();
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
};

// 크롤 상태 저장
const writeCrawlState = async (state: CrawlState) => {
  const filePath = getStatePath();
  const dirPath = path.dirname(filePath);

  // 디렉토리가 없으면 생성
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }

  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
};

export const dynamic = 'force-dynamic';

// GET: 크롤링 상태 조회
export async function GET(request: NextRequest) {
  try {
    const state = await readCrawlState();

    if (!state) {
      return NextResponse.json({
        isCrawling: false,
        lastUpdated: new Date().toISOString()
      });
    }

    // 크롤링 시작 후 30분이 지났으면 자동으로 완료 처리
    if (state.isCrawling && state.startTime) {
      const startTime = new Date(state.startTime).getTime();
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;

      if (now - startTime > thirtyMinutes) {
        // 타임아웃으로 간주하고 상태 초기화
        const newState: CrawlState = {
          isCrawling: false,
          lastUpdated: new Date().toISOString()
        };
        await writeCrawlState(newState);
        return NextResponse.json(newState);
      }
    }

    return NextResponse.json(state);
  } catch (error: any) {
    console.error('Crawl state fetch error:', error);
    return NextResponse.json(
      { error: '크롤 상태 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 크롤링 상태 업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isCrawling, complexCount, currentComplex } = body;

    const state: CrawlState = {
      isCrawling: isCrawling ?? false,
      lastUpdated: new Date().toISOString()
    };

    if (isCrawling) {
      state.startTime = new Date().toISOString();
      if (complexCount !== undefined) state.complexCount = complexCount;
      if (currentComplex) state.currentComplex = currentComplex;
    }

    await writeCrawlState(state);

    return NextResponse.json({
      success: true,
      message: '크롤 상태가 업데이트되었습니다.',
      state
    });

  } catch (error: any) {
    console.error('Crawl state update error:', error);
    return NextResponse.json(
      { error: '크롤 상태 업데이트 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
