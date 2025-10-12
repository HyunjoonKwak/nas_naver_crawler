import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 환경에 따라 경로 결정
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const crawledDataDir = path.join(baseDir, 'crawled_data');
    
    // 디렉토리 존재 확인
    try {
      await fs.access(crawledDataDir);
    } catch {
      return NextResponse.json({
        results: [],
        message: '크롤링 데이터가 없습니다.'
      });
    }

    // 모든 JSON 파일 읽기 (favorites.json 제외)
    const files = await fs.readdir(crawledDataDir);
    const jsonFiles = files.filter(file =>
      file.endsWith('.json') && file !== 'favorites.json'
    );

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
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
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

export async function DELETE(request: NextRequest) {
  try {
    // 환경에 따라 경로 결정
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const crawledDataDir = path.join(baseDir, 'crawled_data');
    
    // 쿼리 파라미터에서 파일명 가져오기
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json(
        { error: '파일명이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }
    
    // 보안: 경로 탐색 공격 방지
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: '유효하지 않은 파일명입니다.' },
        { status: 400 }
      );
    }
    
    // JSON 파일만 삭제 가능
    if (!filename.endsWith('.json')) {
      return NextResponse.json(
        { error: 'JSON 파일만 삭제할 수 있습니다.' },
        { status: 400 }
      );
    }

    // favorites.json 삭제 방지
    if (filename === 'favorites.json') {
      return NextResponse.json(
        { error: '선호단지 파일은 삭제할 수 없습니다.' },
        { status: 403 }
      );
    }
    
    // 파일 경로 생성
    const filePath = path.join(crawledDataDir, filename);
    
    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // JSON 파일 삭제
    await fs.unlink(filePath);
    
    // 같은 이름의 CSV 파일도 삭제 (있다면)
    const csvFilename = filename.replace('.json', '.csv');
    const csvFilePath = path.join(crawledDataDir, csvFilename);
    try {
      await fs.access(csvFilePath);
      await fs.unlink(csvFilePath);
    } catch {
      // CSV 파일이 없어도 무시
    }
    
    return NextResponse.json({
      success: true,
      message: '파일이 삭제되었습니다.',
      filename,
    });
    
  } catch (error: any) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: '파일 삭제 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

