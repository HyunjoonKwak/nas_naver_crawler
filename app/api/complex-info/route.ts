import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/complex-info?complexNo=123456
 * 단지 정보를 조회합니다.
 * 1. DB에서 먼저 조회
 * 2. 없으면 Python 크롤러를 통해 네이버에서 가져오기
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const complexNo = searchParams.get('complexNo');

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. DB에서 먼저 조회
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      include: {
        articles: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }
      }
    });

    if (complex) {
      // DB에 있으면 DB 정보 반환
      const articleCount = await prisma.article.count({
        where: { complexId: complex.id }
      });

      console.log('[complex-info] Found in DB:', complex.complexName);
      return NextResponse.json({
        success: true,
        source: 'database',
        complex: {
          complexNo: complex.complexNo,
          complexName: complex.complexName,
          totalHousehold: complex.totalHousehold,
          totalDong: complex.totalDong,
          address: complex.address,
          roadAddress: complex.roadAddress,
          articleCount,
          lastCrawledAt: complex.articles[0]?.updatedAt?.toISOString(),
        }
      });
    }

    // 2. DB에 없으면 Python 크롤러를 통해 가져오기
    console.log('[complex-info] Not in DB, fetching via Python crawler:', complexNo);

    try {
      const info = await fetchComplexInfoViaCrawler(complexNo);

      if (!info) {
        return NextResponse.json(
          { error: '단지 정보를 찾을 수 없습니다. 단지번호를 확인해주세요.' },
          { status: 404 }
        );
      }

      console.log('[complex-info] Successfully fetched via crawler:', info.complexName);

      return NextResponse.json({
        success: true,
        source: 'crawler',
        complex: {
          complexNo: info.complexNo,
          complexName: info.complexName,
          totalHousehold: info.totalHousehold,
          totalDong: info.totalDong,
          address: info.address,
          roadAddress: info.roadAddress,
          articleCount: 0, // 아직 크롤링 안 함
          lastCrawledAt: null,
        }
      });

    } catch (error: any) {
      console.error('[complex-info] Failed to fetch via crawler:', error);
      return NextResponse.json(
        { error: `단지 정보를 가져오는데 실패했습니다.\n\n오류: ${error.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Complex info fetch error:', error);
    return NextResponse.json(
      { error: '단지 정보 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Python 크롤러를 호출해서 단지 정보만 가져오기
 */
async function fetchComplexInfoViaCrawler(complexNo: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const baseDir = process.cwd();
    const pythonScript = path.join(baseDir, 'logic', 'nas_playwright_crawler.py');

    console.log('[complex-info] Spawning Python:', pythonScript, '--info-only', complexNo);

    const pythonProcess = spawn('python3', [pythonScript, '--info-only', complexNo], {
      cwd: baseDir,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log('[Python stdout]', chunk.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.error('[Python stderr]', chunk.trim());
    });

    pythonProcess.on('close', (code) => {
      console.log('[complex-info] Python process exited with code:', code);

      if (code !== 0) {
        reject(new Error(`Python 크롤러 실행 실패 (exit code: ${code})\n${stderr}`));
        return;
      }

      // JSON 데이터 추출 (===INFO_START=== ~ ===INFO_END=== 사이)
      const startMarker = '===INFO_START===';
      const endMarker = '===INFO_END===';
      const startIdx = stdout.indexOf(startMarker);
      const endIdx = stdout.indexOf(endMarker);

      if (startIdx === -1 || endIdx === -1) {
        reject(new Error('Python 크롤러 응답에서 정보를 찾을 수 없습니다.'));
        return;
      }

      const jsonStr = stdout.substring(startIdx + startMarker.length, endIdx).trim();

      try {
        const info = JSON.parse(jsonStr);
        resolve(info);
      } catch (parseError: any) {
        reject(new Error(`JSON 파싱 실패: ${parseError.message}\n${jsonStr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('[complex-info] Python process error:', error);
      reject(error);
    });

    // 30초 타임아웃
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python 크롤러 실행 타임아웃 (30초)'));
    }, 30000);
  });
}
