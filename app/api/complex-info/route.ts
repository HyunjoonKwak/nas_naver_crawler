import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

/**
 * GET /api/complex-info?complexNo=123456
 * 단지 정보를 조회합니다.
 * 1. DB에서 먼저 조회 (사용자 권한 확인)
 * 2. CSV 파일에서 조회 (크롤링된 데이터)
 * 3. 없으면 Python 크롤러를 통해 네이버에서 가져오기
 */
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();
    const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

    const { searchParams } = new URL(request.url);
    const complexNo = searchParams.get('complexNo');

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. DB에서 먼저 조회 (사용자 필터링 적용)
    const complex = await prisma.complex.findFirst({
      where: {
        complexNo,
        userId: { in: accessibleUserIds }, // 사용자 권한 확인
      },
      include: {
        articles: {
          orderBy: { updatedAt: 'desc' },
          select: {
            updatedAt: true,
            tradeTypeName: true,
            area1: true,
            dealOrWarrantPrc: true,
          }
        }
      }
    });

    if (complex) {
      // DB에 있으면 DB 정보 반환
      const articleCount = complex.articles.length;

      // 면적 범위 계산 (매매만)
      const saleArticles = complex.articles.filter(a => a.tradeTypeName === '매매');
      const areas = [...new Set(saleArticles.map(a => a.area1).filter(Boolean))].sort((a, b) => a! - b!);
      const areaRange = areas.length > 0
        ? areas.length === 1
          ? `${areas[0]}㎡`
          : `${areas[0]}~${areas[areas.length - 1]}㎡`
        : '-';

      // 가격 범위 계산 (매매만, 억 단위로 변환)
      const prices = saleArticles
        .map(a => {
          if (!a.dealOrWarrantPrc) return null;
          // "10억 5,000" 형식을 숫자로 변환
          const priceStr = a.dealOrWarrantPrc.replace(/,/g, '');
          const match = priceStr.match(/(\d+)억\s*(\d+)?/);
          if (match) {
            const eok = parseInt(match[1]);
            const man = match[2] ? parseInt(match[2]) : 0;
            return eok + (man / 10000);
          }
          return null;
        })
        .filter((p): p is number => p !== null)
        .sort((a, b) => a - b);

      const priceRange = prices.length > 0
        ? prices.length === 1
          ? `${prices[0].toFixed(1)}억`
          : `${prices[0].toFixed(1)}~${prices[prices.length - 1].toFixed(1)}억`
        : '-';

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
          areaRange,
          priceRange,
        }
      });
    }

    // 2. CSV 파일에서 조회
    console.log('[complex-info] Not in DB, checking CSV files:', complexNo);

    try {
      const csvInfo = await findComplexInCSV(complexNo);

      if (csvInfo) {
        console.log('[complex-info] Found in CSV:', csvInfo.complexName);
        return NextResponse.json({
          success: true,
          source: 'csv',
          complex: csvInfo,
        });
      }
    } catch (csvError: any) {
      console.warn('[complex-info] CSV lookup failed:', csvError.message);
    }

    // 3. DB와 CSV 모두 없으면 Python 크롤러를 통해 가져오기
    console.log('[complex-info] Not in DB or CSV, fetching via Python crawler:', complexNo);

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
 * CSV 파일에서 단지 정보 찾기
 */
async function findComplexInCSV(complexNo: string): Promise<any> {
  const baseDir = process.cwd();
  const crawledDataDir = path.join(baseDir, 'crawled_data');

  try {
    // crawled_data 디렉토리의 모든 CSV 파일 찾기
    const files = await fs.readdir(crawledDataDir);
    const csvFiles = files
      .filter(f => f.endsWith('.csv') && f.startsWith('complexes_'))
      .sort()
      .reverse(); // 최신 파일 우선

    if (csvFiles.length === 0) {
      console.log('[CSV] No CSV files found');
      return null;
    }

    console.log(`[CSV] Found ${csvFiles.length} CSV files, checking latest: ${csvFiles[0]}`);

    // 최신 CSV 파일 읽기
    const csvPath = path.join(crawledDataDir, csvFiles[0]);
    const csvContent = await fs.readFile(csvPath, 'utf-8');

    // CSV 파싱 (간단한 방식)
    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      console.log('[CSV] CSV file is empty');
      return null;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const complexNoIndex = headers.indexOf('단지번호');
    const complexNameIndex = headers.indexOf('단지명');
    const totalHouseholdIndex = headers.indexOf('세대수');
    const totalDongIndex = headers.indexOf('동수');
    const minAreaIndex = headers.indexOf('최소면적');
    const maxAreaIndex = headers.indexOf('최대면적');
    const minPriceIndex = headers.indexOf('최소가격');
    const maxPriceIndex = headers.indexOf('최대가격');

    if (complexNoIndex === -1) {
      console.error('[CSV] Invalid CSV format: missing 단지번호 column');
      return null;
    }

    // 단지번호로 검색
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());

      if (values[complexNoIndex] === complexNo) {
        console.log(`[CSV] Found complex ${complexNo} in CSV at line ${i + 1}`);

        // 면적 범위 계산
        const minArea = minAreaIndex !== -1 ? parseFloat(values[minAreaIndex]) : null;
        const maxArea = maxAreaIndex !== -1 ? parseFloat(values[maxAreaIndex]) : null;
        const areaRange = minArea && maxArea
          ? minArea === maxArea
            ? `${minArea}㎡`
            : `${minArea}~${maxArea}㎡`
          : minArea
          ? `${minArea}㎡`
          : '-';

        // 가격 범위 계산
        const minPrice = minPriceIndex !== -1 ? parseFloat(values[minPriceIndex]) : null;
        const maxPrice = maxPriceIndex !== -1 ? parseFloat(values[maxPriceIndex]) : null;
        const priceRange = minPrice && maxPrice
          ? minPrice === maxPrice
            ? `${(minPrice / 10000).toFixed(1)}억`
            : `${(minPrice / 10000).toFixed(1)}~${(maxPrice / 10000).toFixed(1)}억`
          : minPrice
          ? `${(minPrice / 10000).toFixed(1)}억`
          : '-';

        return {
          complexNo,
          complexName: complexNameIndex !== -1 ? values[complexNameIndex] : '',
          totalHousehold: totalHouseholdIndex !== -1 ? parseInt(values[totalHouseholdIndex]) : null,
          totalDong: totalDongIndex !== -1 ? parseInt(values[totalDongIndex]) : null,
          areaRange,
          priceRange,
          articleCount: 0,
          lastCrawledAt: null,
        };
      }
    }

    console.log(`[CSV] Complex ${complexNo} not found in CSV`);
    return null;

  } catch (error: any) {
    console.error('[CSV] Error reading CSV:', error.message);
    throw error;
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

    const pythonProcess = spawn('python3', ['-u', pythonScript, '--info-only', complexNo], {
      cwd: baseDir,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout;
    let isResolved = false;

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
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);

      console.log('[complex-info] Python process exited with code:', code);

      if (code !== 0 && code !== null) {
        reject(new Error(`Python 크롤러 실행 실패 (exit code: ${code})\n${stderr}`));
        return;
      }

      // JSON 데이터 추출 (===INFO_START=== ~ ===INFO_END=== 사이)
      const startMarker = '===INFO_START===';
      const endMarker = '===INFO_END===';
      const startIdx = stdout.indexOf(startMarker);
      const endIdx = stdout.indexOf(endMarker);

      if (startIdx === -1 || endIdx === -1) {
        reject(new Error('Python 크롤러 응답에서 정보를 찾을 수 없습니다.\n\n출력:\n' + stdout.substring(0, 500)));
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
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);
      console.error('[complex-info] Python process error:', error);
      reject(error);
    });

    // 60초 타임아웃 (브라우저 초기화 시간 고려)
    timeoutId = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;

      console.error('[complex-info] Timeout reached, killing Python process');
      pythonProcess.kill('SIGTERM');

      // SIGTERM으로 안 죽으면 SIGKILL
      setTimeout(() => {
        if (pythonProcess.exitCode === null) {
          console.error('[complex-info] Force killing with SIGKILL');
          pythonProcess.kill('SIGKILL');
        }
      }, 5000);

      reject(new Error('Python 크롤러 실행 타임아웃 (60초)\n\n브라우저 초기화에 시간이 오래 걸릴 수 있습니다.'));
    }, 60000);
  });
}
