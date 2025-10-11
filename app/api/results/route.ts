import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const crawledDataDir = path.join('/app', 'crawled_data');
    
    // 디렉토리 존재 확인
    try {
      await fs.access(crawledDataDir);
    } catch {
      return NextResponse.json({
        results: [],
        message: '크롤링 데이터가 없습니다.'
      });
    }

    // 모든 JSON 파일 읽기
    const files = await fs.readdir(crawledDataDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // 파일 정보 수집
    const results = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(crawledDataDir, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        
        let data;
        try {
          data = JSON.parse(content);
        } catch {
          data = null;
        }

        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          data: data,
        };
      })
    );

    // 최신순으로 정렬
    results.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      results,
      total: results.length
    });

  } catch (error: any) {
    console.error('Results fetch error:', error);
    return NextResponse.json(
      { error: '결과 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

