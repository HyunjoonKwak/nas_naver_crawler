/**
 * 이미지 업로드 API
 * POST: 이미지 파일 업로드
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireAuth } from '@/lib/auth-utils';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'posts');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /api/upload - 이미지 업로드
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size exceeds 5MB limit',
        },
        { status: 400 }
      );
    }

    // 업로드 디렉토리 생성
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // 파일명 생성 (타임스탬프 + 랜덤 + 원본 확장자)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const filename = `${timestamp}-${random}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // URL 생성
    const url = `/uploads/posts/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Failed to upload file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload file',
      },
      { status: 500 }
    );
  }
}
