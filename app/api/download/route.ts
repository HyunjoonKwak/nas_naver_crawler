import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth-utils';

const CRAWLED_DATA_DIR = 'crawled_data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // ADMIN만 파일 다운로드 가능
    const currentUser = await requireAuth();
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 파일을 다운로드할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // 보안: 경로 탐색 공격 방지
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const filePath = path.join(baseDir, CRAWLED_DATA_DIR, filename);

    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 파일 읽기
    const fileBuffer = await fs.readFile(filePath);

    // 응답 헤더 설정
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
