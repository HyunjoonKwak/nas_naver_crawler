import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const crawledDataDir = path.join(baseDir, 'crawled_data');
    
    // 최신 상태 파일 찾기
    try {
      const files = await fs.readdir(crawledDataDir);
      const statusFiles = files.filter(f => f.startsWith('crawl_status_') && f.endsWith('.json'));
      
      if (statusFiles.length === 0) {
        return NextResponse.json({
          status: 'idle',
          message: '진행 중인 크롤링이 없습니다.'
        });
      }
      
      // 최신 파일 선택 (파일명에 타임스탬프 포함)
      const latestStatusFile = statusFiles.sort().reverse()[0];
      const statusFilePath = path.join(crawledDataDir, latestStatusFile);
      
      // 파일 읽기
      const content = await fs.readFile(statusFilePath, 'utf-8');
      const statusData = JSON.parse(content);
      
      // 상태가 completed 또는 error면 파일 삭제 (1분 후)
      const timestamp = new Date(statusData.timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - timestamp.getTime()) / 1000 / 60;
      
      if ((statusData.status === 'completed' || statusData.status === 'error') && diffMinutes > 1) {
        // 1분 이상 지난 완료/에러 상태 파일은 삭제
        await fs.unlink(statusFilePath).catch(() => {});
        return NextResponse.json({
          status: 'idle',
          message: '진행 중인 크롤링이 없습니다.'
        });
      }
      
      return NextResponse.json(statusData);
      
    } catch (error: any) {
      // 디렉토리 없거나 파일 없으면 idle 상태
      if (error.code === 'ENOENT') {
        return NextResponse.json({
          status: 'idle',
          message: '진행 중인 크롤링이 없습니다.'
        });
      }
      throw error;
    }
    
  } catch (error: any) {
    console.error('Crawl status check error:', error);
    return NextResponse.json(
      { error: '상태 확인 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

