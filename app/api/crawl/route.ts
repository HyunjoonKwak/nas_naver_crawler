import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { complexNumbers } = body;

    if (!complexNumbers || complexNumbers.length === 0) {
      return NextResponse.json(
        { error: '단지 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const complexNos = Array.isArray(complexNumbers) 
      ? complexNumbers.join(',') 
      : complexNumbers;

    // 컨테이너 내부에서 직접 Python 크롤러 실행
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const command = `python3 ${baseDir}/logic/nas_playwright_crawler.py "${complexNos}"`;

    const { stdout, stderr } = await execAsync(command, {
      cwd: baseDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 300000, // 5분 타임아웃
    });

    return NextResponse.json({
      success: true,
      message: '크롤링이 완료되었습니다.',
      stdout,
      stderr,
      complexNumbers: complexNos,
    });

  } catch (error: any) {
    console.error('Crawling error:', error);
    return NextResponse.json(
      { 
        error: '크롤링 중 오류가 발생했습니다.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST 요청을 사용해주세요.',
    example: {
      complexNumbers: ['22065', '12345']
    }
  });
}

