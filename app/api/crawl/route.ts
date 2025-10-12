import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

// 크롤링 결과를 DB에 저장하는 함수
async function saveCrawlResultsToDB(complexNos: string[]) {
  const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
  const crawledDataDir = path.join(baseDir, 'crawled_data');

  let totalArticles = 0;
  let totalComplexes = 0;
  let errors: string[] = [];

  try {
    // 최신 크롤링 결과 파일 찾기 (complexes_N_날짜.json 형식)
    const files = await fs.readdir(crawledDataDir);
    const jsonFiles = files
      .filter(f => f.startsWith('complexes_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (jsonFiles.length === 0) {
      console.log('No crawl result files found');
      return { totalArticles: 0, totalComplexes: 0, errors: ['No data files found'] };
    }

    // 가장 최신 파일 사용
    const latestFile = path.join(crawledDataDir, jsonFiles[0]);
    console.log(`Processing file: ${jsonFiles[0]}`);

    const rawData = await fs.readFile(latestFile, 'utf-8');
    const crawlData = JSON.parse(rawData);

    // 데이터가 배열인지 확인
    const dataArray = Array.isArray(crawlData) ? crawlData : [crawlData];
    console.log(`Found ${dataArray.length} complexes in file`);

    for (const data of dataArray) {
      if (!data.overview || !data.articles) {
        console.log('Skipping item without overview or articles');
        continue;
      }

      const overview = data.overview;

        // 1. 단지 정보 Upsert
        const complex = await prisma.complex.upsert({
          where: { complexNo: overview.complexNo },
          update: {
            complexName: overview.complexName,
            totalHousehold: overview.totalHousehold,
            totalDong: overview.totalDong,
            latitude: overview.location?.latitude,
            longitude: overview.location?.longitude,
            address: overview.address,
            roadAddress: overview.roadAddress,
            jibunAddress: overview.jibunAddress,
            beopjungdong: overview.beopjungdong,
            haengjeongdong: overview.haengjeongdong,
          },
          create: {
            complexNo: overview.complexNo,
            complexName: overview.complexName,
            totalHousehold: overview.totalHousehold,
            totalDong: overview.totalDong,
            latitude: overview.location?.latitude,
            longitude: overview.location?.longitude,
            address: overview.address,
            roadAddress: overview.roadAddress,
            jibunAddress: overview.jibunAddress,
            beopjungdong: overview.beopjungdong,
            haengjeongdong: overview.haengjeongdong,
          },
        });

        totalComplexes++;

        // 2. 매물 정보 저장
        for (const article of data.articles) {
          try {
            await prisma.article.upsert({
              where: { articleNo: article.articleNo },
              update: {
                complexId: complex.id,
                realEstateTypeName: article.realEstateTypeName || '아파트',
                tradeTypeName: article.tradeTypeName,
                dealOrWarrantPrc: article.dealOrWarrantPrc,
                rentPrc: article.rentPrc,
                area1: parseFloat(article.area1) || 0,
                area2: article.area2 ? parseFloat(article.area2) : null,
                floorInfo: article.floorInfo,
                direction: article.direction,
                articleConfirmYmd: article.articleConfirmYmd,
                tagList: article.tagList || [],
              },
              create: {
                articleNo: article.articleNo,
                complexId: complex.id,
                realEstateTypeName: article.realEstateTypeName || '아파트',
                tradeTypeName: article.tradeTypeName,
                dealOrWarrantPrc: article.dealOrWarrantPrc,
                rentPrc: article.rentPrc,
                area1: parseFloat(article.area1) || 0,
                area2: article.area2 ? parseFloat(article.area2) : null,
                floorInfo: article.floorInfo,
                direction: article.direction,
                articleConfirmYmd: article.articleConfirmYmd,
                tagList: article.tagList || [],
              },
            });

            totalArticles++;
          } catch (articleError: any) {
            console.error(`Failed to save article ${article.articleNo}:`, articleError.message);
            errors.push(`Article ${article.articleNo}: ${articleError.message}`);
          }
        }

      totalComplexes++;
    }
  } catch (error: any) {
    console.error('Failed to process crawl data:', error);
    errors.push(`File processing error: ${error.message}`);
  }

  return { totalArticles, totalComplexes, errors };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { complexNumbers } = body;

    if (!complexNumbers || complexNumbers.length === 0) {
      return NextResponse.json(
        { error: '단지 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const complexNosArray = Array.isArray(complexNumbers)
      ? complexNumbers
      : complexNumbers.split(',').map((n: string) => n.trim());

    const complexNos = complexNosArray.join(',');

    // 1. Python 크롤러 실행
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const command = `python3 ${baseDir}/logic/nas_playwright_crawler.py "${complexNos}"`;

    console.log('🚀 Starting crawler...');
    const { stdout, stderr } = await execAsync(command, {
      cwd: baseDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 900000, // 15분 타임아웃
    });

    // Python 출력을 로그에 표시
    if (stdout) {
      console.log('=== Python Crawler Output ===');
      console.log(stdout);
    }
    if (stderr) {
      console.error('=== Python Crawler Errors ===');
      console.error(stderr);
    }

    // 2. 크롤링 결과를 DB에 저장
    console.log('💾 Saving results to database...');
    const dbResult = await saveCrawlResultsToDB(complexNosArray);

    const duration = Date.now() - startTime;
    const status = dbResult.errors.length > 0 ? 'partial_success' : 'success';

    // 3. 크롤링 히스토리 저장
    await prisma.crawlHistory.create({
      data: {
        complexNos: complexNosArray,
        totalComplexes: complexNosArray.length,
        successCount: dbResult.totalComplexes,
        errorCount: complexNosArray.length - dbResult.totalComplexes,
        totalArticles: dbResult.totalArticles,
        duration: Math.floor(duration / 1000), // 초 단위
        status,
        errorMessage: dbResult.errors.length > 0 ? dbResult.errors.join(', ') : null,
      },
    });

    console.log('✅ Crawl completed and saved to DB');
    console.log(`   - Complexes: ${dbResult.totalComplexes}`);
    console.log(`   - Articles: ${dbResult.totalArticles}`);
    console.log(`   - Duration: ${Math.floor(duration / 1000)}s`);

    return NextResponse.json({
      success: true,
      message: '크롤링이 완료되고 데이터베이스에 저장되었습니다.',
      data: {
        complexes: dbResult.totalComplexes,
        articles: dbResult.totalArticles,
        duration: Math.floor(duration / 1000),
        errors: dbResult.errors,
      },
      stdout,
      stderr,
    });

  } catch (error: any) {
    console.error('❌ Crawling error:', error);

    // 에러도 히스토리에 기록
    try {
      const duration = Date.now() - startTime;
      await prisma.crawlHistory.create({
        data: {
          complexNos: [],
          totalComplexes: 0,
          successCount: 0,
          errorCount: 1,
          totalArticles: 0,
          duration: Math.floor(duration / 1000),
          status: 'error',
          errorMessage: error.message,
        },
      });
    } catch (historyError) {
      console.error('Failed to save error history:', historyError);
    }

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
