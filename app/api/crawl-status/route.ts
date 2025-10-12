import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const crawledDataDir = path.join(baseDir, 'crawled_data');

    // crawl_status_*.json 파일 찾기
    const files = await fs.readdir(crawledDataDir);
    const statusFiles = files
      .filter(file => file.startsWith('crawl_status_') && file.endsWith('.json'))
      .sort()
      .reverse(); // 최신 파일이 먼저 오도록

    if (statusFiles.length === 0) {
      return NextResponse.json({
        found: false,
        message: '크롤 상태 파일이 없습니다.'
      });
    }

    // 최신 상태 파일 읽기
    const latestStatusFile = statusFiles[0];
    const statusFilePath = path.join(crawledDataDir, latestStatusFile);
    const content = await fs.readFile(statusFilePath, 'utf-8');
    const statusData = JSON.parse(content);

    return NextResponse.json({
      found: true,
      filename: latestStatusFile,
      ...statusData
    });

  } catch (error: any) {
    console.error('Error reading crawl status:', error);
    return NextResponse.json(
      {
        error: '크롤 상태 조회 중 오류가 발생했습니다.',
        details: error.message
      },
      { status: 500 }
    );
  }
}
