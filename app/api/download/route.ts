import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const CRAWLED_DATA_DIR = 'crawled_data';
const logger = createLogger('DOWNLOAD');

export const dynamic = 'force-dynamic';

export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  // ADMIN만 파일 다운로드 가능
  const currentUser = await requireAuth();
  if (currentUser.role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, '관리자만 파일을 다운로드할 수 있습니다.', 403);
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    throw new ApiError(ErrorType.VALIDATION, 'Filename is required', 400);
  }

  // 보안: 경로 탐색 공격 방지
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new ApiError(ErrorType.VALIDATION, 'Invalid filename', 400);
  }

  const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
  const filePath = path.join(baseDir, CRAWLED_DATA_DIR, filename);

  // 파일 존재 확인
  try {
    await fs.access(filePath);
  } catch {
    throw new ApiError(ErrorType.NOT_FOUND, 'File not found', 404);
  }

  // 파일 읽기
  const fileBuffer = await fs.readFile(filePath);

  logger.info('File downloaded', { filename, userId: currentUser.id });

  // 응답 헤더 설정
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);

  return new NextResponse(fileBuffer as any, {
    status: 200,
    headers,
  });
});
