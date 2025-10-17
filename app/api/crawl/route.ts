import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimit, rateLimitPresets } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import {
  detectArticleChanges,
  filterChangesForAlerts,
  getComplexInfo,
  saveNotificationLog,
} from '@/lib/article-tracker';
import {
  sendDiscordNotification,
  createNewArticleEmbed,
  createDeletedArticleEmbed,
  createPriceChangedEmbed,
  createCrawlSummaryEmbed,
} from '@/lib/discord';
import { eventBroadcaster } from '@/lib/eventBroadcaster';
import { calculateDynamicTimeout } from '@/lib/timeoutCalculator';

const execAsync = promisify(exec);
const logger = createLogger('CRAWL');

export const dynamic = 'force-dynamic';

// Global crawl state for progress tracking
let currentCrawlId: string | null = null;

// 크롤링 결과를 DB에 저장하는 함수 (Batch Insert 방식)
async function saveCrawlResultsToDB(crawlId: string, complexNos: string[], userId: string) {
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
      .map(f => {
        const fullPath = path.join(crawledDataDir, f);
        const stats = require('fs').statSync(fullPath);
        return { name: f, mtime: stats.mtime };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())  // Sort by modification time (newest first)
      .map(f => f.name);

    if (jsonFiles.length === 0) {
      console.log('No crawl result files found');
      return { totalArticles: 0, totalComplexes: 0, errors: ['No data files found'] };
    }

    // 가장 최신 파일 사용 (수정 시간 기준)
    const latestFile = path.join(crawledDataDir, jsonFiles[0]);
    console.log(`Processing file: ${jsonFiles[0]} (latest by mtime)`);

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
        pyeongs: overview.pyeongs || [],
        userId: userId, // 크롤링 실행한 사용자 ID
      });

      // Note: processedComplexes is updated by Python crawler in real-time
      // No need to update here to avoid progress bar confusion
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
        logger.error(`Complex ID not found for ${overview.complexNo}`);
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
          buildingName: article.buildingName,
          sameAddrCnt: article.sameAddrCnt ? parseInt(article.sameAddrCnt) : null,
          realtorName: article.realtorName,
          articleFeatureDesc: article.articleFeatureDesc,
          tagList: article.tagList || [],
        });
      }
    }

    // Batch insert articles (단지별로 기존 매물 전체 삭제 후 재생성)
    // 1. 크롤링된 단지들의 complexId 목록 추출
    const crawledComplexIds = Array.from(new Set(articlesToCreate.map(a => a.complexId)));

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: `Deleting old articles from ${crawledComplexIds.length} complexes`,
      },
    });

    // 2. 해당 단지들의 모든 기존 매물 삭제 (삭제된 매물 반영)
    await prisma.article.deleteMany({
      where: {
        complexId: {
          in: crawledComplexIds,
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
    const articlesBeforeInsert = articlesToCreate.length;
    const result = await prisma.article.createMany({
      data: articlesToCreate,
      skipDuplicates: true,
    });

    totalArticles = result.count;

    // 중복 제거된 매물이 있으면 로그 출력
    if (articlesBeforeInsert > totalArticles) {
      console.log(`⚠️  Duplicates skipped: ${articlesBeforeInsert - totalArticles} articles (${articlesBeforeInsert} → ${totalArticles})`);
    }

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: 'Database save completed',
        processedArticles: totalArticles,
      },
    });

    console.log(`✅ Batch save completed: ${totalComplexes} complexes, ${totalArticles} articles`);

  } catch (error: any) {
    logger.error('Failed to process crawl data', error);
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

// 알림 발송 함수
async function sendAlertsForChanges(complexNos: string[]) {
  console.log('🔔 Checking for alerts...');

  for (const complexNo of complexNos) {
    try {
      // 1. 현재 매물 데이터 조회
      const complexInfo = await getComplexInfo(complexNo);
      if (!complexInfo) {
        console.log(`Complex not found: ${complexNo}`);
        continue;
      }

      const currentArticles = await prisma.article.findMany({
        where: { complexId: complexInfo.id },
      });

      // 2. 변경사항 감지
      const changes = await detectArticleChanges(complexNo, currentArticles);

      console.log(`📊 Changes for ${complexInfo.complexName}:`, {
        new: changes.newArticles.length,
        deleted: changes.deletedArticles.length,
        priceChanged: changes.priceChangedArticles.length,
      });

      // 변경사항이 없으면 스킵
      if (
        changes.newArticles.length === 0 &&
        changes.deletedArticles.length === 0 &&
        changes.priceChangedArticles.length === 0
      ) {
        console.log(`No changes for ${complexInfo.complexName}, skipping alerts`);
        continue;
      }

      // 3. 알림 조건에 맞는 변경사항 필터링
      const alertTargets = await filterChangesForAlerts(complexNo, changes);

      if (alertTargets.length === 0) {
        console.log(`No active alerts for ${complexInfo.complexName}`);
        continue;
      }

      console.log(`📬 Sending alerts to ${alertTargets.length} alert(s)`);

      // 4. 각 알림에 대해 Discord 웹훅 전송
      for (const target of alertTargets) {
        if (!target.alert.webhookUrl) {
          console.log(`No webhook URL for alert: ${target.alert.name}`);
          continue;
        }

        try {
          const embeds: any[] = [];

          // 신규 매물 알림
          for (const article of target.newArticles) {
            embeds.push(
              createNewArticleEmbed(article, complexInfo.complexName, complexNo)
            );
          }

          // 삭제된 매물 알림
          for (const article of target.deletedArticles) {
            embeds.push(
              createDeletedArticleEmbed(article, complexInfo.complexName, complexNo)
            );
          }

          // 가격 변동 알림
          for (const { old: oldArticle, new: newArticle } of target.priceChangedArticles) {
            embeds.push(
              createPriceChangedEmbed(
                oldArticle,
                newArticle,
                complexInfo.complexName,
                complexNo
              )
            );
          }

          // 요약 임베드 추가
          embeds.push(
            createCrawlSummaryEmbed({
              complexName: complexInfo.complexName,
              complexNo,
              newCount: target.newArticles.length,
              deletedCount: target.deletedArticles.length,
              priceChangedCount: target.priceChangedArticles.length,
              totalArticles: currentArticles.length,
              duration: 0, // 크롤링 시간은 여기선 불필요
            })
          );

          // Discord로 전송 (한 번에 최대 10개 embed)
          for (let i = 0; i < embeds.length; i += 10) {
            const batch = embeds.slice(i, i + 10);

            const result = await sendDiscordNotification(target.alert.webhookUrl, {
              username: '네이버 부동산 크롤러',
              content:
                i === 0
                  ? `🔔 **${target.alert.name}** 알림\n${complexInfo.complexName}에 변경사항이 있습니다!`
                  : undefined,
              embeds: batch,
            });

            // 알림 로그 저장
            await saveNotificationLog(
              target.alertId,
              'webhook',
              result.success ? 'sent' : 'failed',
              result.success
                ? `Sent ${batch.length} notifications`
                : result.error || 'Unknown error'
            );

            if (!result.success) {
              console.error(`Failed to send alert: ${result.error}`);
            } else {
              console.log(`✅ Sent ${batch.length} notification(s) for alert: ${target.alert.name}`);
            }

            // Discord API 속도 제한 방지
            if (i + 10 < embeds.length) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        } catch (error: any) {
          console.error(`Failed to send alert for ${target.alert.name}:`, error);
          await saveNotificationLog(
            target.alertId,
            'webhook',
            'failed',
            error.message || 'Unknown error'
          );
        }
      }
    } catch (error: any) {
      console.error(`Failed to process alerts for ${complexNo}:`, error);
    }
  }

  console.log('✅ Alert processing completed');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let crawlId: string | null = null;

  try {
    // Rate Limiting (분당 10회)
    const rateLimitResponse = rateLimit(request, rateLimitPresets.crawl);
    if (rateLimitResponse) return rateLimitResponse;

    // 사용자 인증 확인
    const currentUser = await requireAuth();

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
        userId: currentUser.id, // 크롤링 실행한 사용자 ID
      },
    });

    crawlId = crawlHistory.id;
    currentCrawlId = crawlId;

    // 🔔 실시간 알림: 크롤링 시작
    eventBroadcaster.notifyCrawlStart(crawlId, complexNosArray.length);

    // 2. Python 크롤러 실행 (crawl_id 전달)
    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const command = `python3 ${baseDir}/logic/nas_playwright_crawler.py "${complexNos}" "${crawlId}"`;

    logger.info('Starting crawler', { crawlId, complexNos: complexNosArray.length });

    // 동적 타임아웃 계산
    const dynamicTimeout = await calculateDynamicTimeout(complexNosArray.length);
    logger.info('Dynamic timeout calculated', {
      seconds: Math.floor(dynamicTimeout / 1000),
      minutes: Math.floor(dynamicTimeout / 60000)
    });

    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: `Crawling ${complexNosArray.length} complexes`,
      },
    });

    const { stdout, stderr } = await execAsync(command, {
      cwd: baseDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: dynamicTimeout, // 동적 타임아웃 (크롤링 히스토리 기반 계산)
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
    logger.info('Saving results to database');
    const dbResult = await saveCrawlResultsToDB(crawlId, complexNosArray, currentUser.id);

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

    // 🔔 실시간 알림: 크롤링 완료
    eventBroadcaster.notifyCrawlComplete(crawlId, dbResult.totalArticles);

    logger.info('Crawl completed and saved to DB', {
      complexes: dbResult.totalComplexes,
      articles: dbResult.totalArticles,
      durationSeconds: Math.floor(duration / 1000),
      status
    });

    // 5. 알림 발송 (비동기로 실행하여 응답 지연 방지)
    sendAlertsForChanges(complexNosArray).catch((error) => {
      logger.error('Failed to send alerts', error);
    });

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
    logger.error('Crawling error', error);

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

        // 🔔 실시간 알림: 크롤링 실패
        eventBroadcaster.notifyCrawlFailed(crawlId, error.message);
      } catch (historyError) {
        logger.error('Failed to update error history', historyError);
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
