import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

// Global crawl state for progress tracking
let currentCrawlId: string | null = null;

// 크롤링 결과를 DB에 저장하는 함수 (Batch Insert 방식)
async function saveCrawlResultsToDB(crawlId: string, complexNos: string[]) {
  const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
  const crawledDataDir = path.join(baseDir, 'crawled_data');

  let totalArticles = 0;
  let totalComplexes = 0;
  let errors: string[] = [];

  try {
    // Update status: saving to DB
    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        status: 'saving',
        currentStep: 'Reading crawl result files',
      },
    });

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

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: `Processing ${dataArray.length} complexes`,
      },
    });

    // 모든 단지 정보를 먼저 수집
    const complexesToUpsert: any[] = [];
    const articlesToCreate: any[] = [];
    const complexNoToIdMap = new Map<string, string>();

    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];

      if (!data.overview || !data.articles) {
        console.log('Skipping item without overview or articles');
        continue;
      }

      const overview = data.overview;
      const articleList = data.articles.articleList || [];

      // 단지 정보 준비
      complexesToUpsert.push({
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
      });

      // Progress update
      await prisma.crawlHistory.update({
        where: { id: crawlId },
        data: {
          currentStep: `Preparing complex ${i + 1}/${dataArray.length}`,
          processedComplexes: i + 1,
        },
      });
    }

    // Batch upsert complexes
    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: 'Saving complex information',
      },
    });

    for (const complexData of complexesToUpsert) {
      const complex = await prisma.complex.upsert({
        where: { complexNo: complexData.complexNo },
        update: complexData,
        create: complexData,
      });
      complexNoToIdMap.set(complexData.complexNo, complex.id);
      totalComplexes++;
    }

    // 모든 매물 데이터 준비 (complexId 매핑)
    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: 'Preparing article data',
      },
    });

    for (const data of dataArray) {
      if (!data.overview || !data.articles) continue;

      const overview = data.overview;
      const articleList = data.articles.articleList || [];
      const complexId = complexNoToIdMap.get(overview.complexNo);

      if (!complexId) {
        console.error(`Complex ID not found for ${overview.complexNo}`);
        continue;
      }

      for (const article of articleList) {
        articlesToCreate.push({
          articleNo: article.articleNo,
          complexId: complexId,
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
        });
      }
    }

    // Batch insert articles (중복 제거를 위해 deleteMany 후 createMany)
    // 1. 기존 articleNo들 가져오기
    const articleNos = articlesToCreate.map(a => a.articleNo);

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: `Deleting old articles (${articleNos.length} items)`,
      },
    });

    // 2. 기존 매물 삭제 (upsert 대신 delete + create로 성능 향상)
    await prisma.article.deleteMany({
      where: {
        articleNo: {
          in: articleNos,
        },
      },
    });

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: `Saving articles (${articlesToCreate.length} items)`,
      },
    });

    // 3. Batch insert (skipDuplicates로 안전하게)
    const result = await prisma.article.createMany({
      data: articlesToCreate,
      skipDuplicates: true,
    });

    totalArticles = result.count;

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: 'Database save completed',
        processedArticles: totalArticles,
      },
    });

    console.log(`✅ Batch save completed: ${totalComplexes} complexes, ${totalArticles} articles`);

  } catch (error: any) {
    console.error('Failed to process crawl data:', error);
    errors.push(`Database save error: ${error.message}`);

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        status: 'failed',
        errorMessage: errors.join(', '),
      },
    });
  }

  return { totalArticles, totalComplexes, errors };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let crawlId: string | null = null;

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

    // 1. 크롤링 히스토리 생성 (진행 중 상태)
    const crawlHistory = await prisma.crawlHistory.create({
      data: {
        complexNos: complexNosArray,
        totalComplexes: complexNosArray.length,
        successCount: 0,
        errorCount: 0,
        totalArticles: 0,
        duration: 0,
        status: 'crawling',
        currentStep: 'Starting crawler',
        processedArticles: 0,
        processedComplexes: 0,
      },
    });

    crawlId = crawlHistory.id;
    currentCrawlId = crawlId;

    // 2. Python 크롤러 실행 (crawl_id 전달)
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const command = `python3 ${baseDir}/logic/nas_playwright_crawler.py "${complexNos}" "${crawlId}"`;

    console.log('🚀 Starting crawler...');
    console.log(`   - Crawl ID: ${crawlId}`);
    console.log(`   - Complexes: ${complexNos}`);

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: `Crawling ${complexNosArray.length} complexes`,
      },
    });

    const { stdout, stderr } = await execAsync(command, {
      cwd: baseDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 1800000, // 30분 타임아웃 (15분 → 30분으로 증가)
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

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: 'Crawling completed',
      },
    });

    // 3. 크롤링 결과를 DB에 저장 (Batch Insert)
    console.log('💾 Saving results to database...');
    const dbResult = await saveCrawlResultsToDB(crawlId, complexNosArray);

    const duration = Date.now() - startTime;
    const status = dbResult.errors.length > 0 ? 'partial' : 'success';

    // 4. 최종 히스토리 업데이트
    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        successCount: dbResult.totalComplexes,
        errorCount: complexNosArray.length - dbResult.totalComplexes,
        totalArticles: dbResult.totalArticles,
        duration: Math.floor(duration / 1000), // 초 단위
        status,
        errorMessage: dbResult.errors.length > 0 ? dbResult.errors.join(', ') : null,
        currentStep: 'Completed',
      },
    });

    currentCrawlId = null;

    console.log('✅ Crawl completed and saved to DB');
    console.log(`   - Complexes: ${dbResult.totalComplexes}`);
    console.log(`   - Articles: ${dbResult.totalArticles}`);
    console.log(`   - Duration: ${Math.floor(duration / 1000)}s`);

    return NextResponse.json({
      success: true,
      message: '크롤링이 완료되고 데이터베이스에 저장되었습니다.',
      crawlId,
      data: {
        complexes: dbResult.totalComplexes,
        articles: dbResult.totalArticles,
        duration: Math.floor(duration / 1000),
        errors: dbResult.errors,
      },
    });

  } catch (error: any) {
    console.error('❌ Crawling error:', error);

    // 에러 히스토리 업데이트
    if (crawlId) {
      try {
        const duration = Date.now() - startTime;
        await prisma.crawlHistory.update({
          where: { id: crawlId },
          data: {
            duration: Math.floor(duration / 1000),
            status: 'failed',
            errorMessage: error.message,
            currentStep: 'Failed',
          },
        });
      } catch (historyError) {
        console.error('Failed to update error history:', historyError);
      }
    }

    currentCrawlId = null;

    return NextResponse.json(
      {
        error: '크롤링 중 오류가 발생했습니다.',
        details: error.message,
        crawlId,
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
