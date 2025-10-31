import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimit, rateLimitPresets } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { parsePriceToWonBigInt } from '@/lib/price-utils';
import fs from 'fs/promises';
import path from 'path';
import { eventBroadcaster } from '@/lib/eventBroadcaster';
import { sendDiscordNotification, createCrawlSummaryEmbed } from '@/lib/discord';

const logger = createLogger('CRAWL');

export const dynamic = 'force-dynamic';

// Global crawl state for progress tracking
let currentCrawlId: string | null = null;
let isCurrentlyCrawling: boolean = false;

/**
 * NOTE: executeCrawlInBackground, saveCrawlResultsToDB, and sendAlertsForChanges
 * have been extracted to services/:
 * - services/crawler-executor.ts
 * - services/crawl-db-service.ts
 * - services/alert-service.ts
 * - services/crawl-workflow.ts (orchestration)
 */

// Legacy function retained for sendScheduleCrawlCompleteNotification compatibility
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

      // Overview와 Articles 중 최소 하나는 있어야 함
      if (!data.overview && !data.articles) {
        console.log('Skipping item without overview and articles');
        continue;
      }

      const overview = data.overview;
      const articleList = data.articles?.articleList || [];

      // complexNo 우선순위: overview > crawling_info
      const complexNo = overview?.complexNo || data.crawling_info?.complex_no;

      if (!complexNo) {
        console.log(`⚠️  Skipping item ${i}: complexNo not found in overview or crawling_info`);
        errors.push(`Complex ${i}: Missing complexNo`);
        continue;
      }

      // 위치 정보: overview 또는 첫 번째 매물에서 가져오기
      const firstArticle = articleList[0];
      const latitude = overview?.location?.latitude || overview?.latitude ||
                      (firstArticle?.latitude ? parseFloat(firstArticle.latitude) : null);
      const longitude = overview?.location?.longitude || overview?.longitude ||
                       (firstArticle?.longitude ? parseFloat(firstArticle.longitude) : null);

      // 단지 정보 준비 (Overview 없어도 기본값으로 저장)
      complexesToUpsert.push({
        complexNo: complexNo,
        complexName: overview?.complexName || `단지 ${complexNo}`,
        totalHousehold: overview?.totalHouseHoldCount || overview?.totalHousehold || null,
        totalDong: overview?.totalDongCount || overview?.totalDong || null,
        latitude: latitude,
        longitude: longitude,
        address: overview?.address || null,
        roadAddress: overview?.roadAddress || null,
        jibunAddress: overview?.jibunAddress || null,
        beopjungdong: overview?.beopjungdong || null,
        haengjeongdong: overview?.haengjeongdong || null,
        pyeongs: overview?.pyeongs || [],
        userId: userId, // 크롤링 실행한 사용자 ID
      });

      // Note: processedComplexes is updated by Python crawler in real-time
      // No need to update here to avoid progress bar confusion
    }

    // ✅ 역지오코딩: 좌표가 있지만 법정동 정보가 없는 단지에 대해 자동으로 주소 정보 추가
    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: 'Reverse geocoding addresses',
      },
    });

    // 📌 최적화: DB에서 기존 단지의 법정동 정보 가져오기
    const complexNos = complexesToUpsert.map(c => c.complexNo);
    const existingComplexes = await prisma.complex.findMany({
      where: { complexNo: { in: complexNos } },
      select: {
        complexNo: true,
        beopjungdong: true,
        haengjeongdong: true,
        sidoCode: true,
        sigunguCode: true,
        dongCode: true,
        lawdCd: true,
      },
    });

    // Map으로 빠른 조회
    const existingDataMap = new Map(
      existingComplexes.map(c => [c.complexNo, c])
    );

    // 기존 단지의 법정동 정보 병합
    let skippedGeocoding = 0;
    for (const complex of complexesToUpsert) {
      const existing = existingDataMap.get(complex.complexNo);
      if (existing && existing.beopjungdong) {
        // DB에 법정동 정보가 있으면 사용
        complex.beopjungdong = complex.beopjungdong || existing.beopjungdong;
        complex.haengjeongdong = complex.haengjeongdong || existing.haengjeongdong;
        complex.sidoCode = complex.sidoCode || existing.sidoCode;
        complex.sigunguCode = complex.sigunguCode || existing.sigunguCode;
        complex.dongCode = complex.dongCode || existing.dongCode;
        complex.lawdCd = complex.lawdCd || existing.lawdCd;
        skippedGeocoding++;
        console.log(`💾 ${complex.complexName} (${complex.complexNo}): 기존 법정동 정보 재사용 → 지오코딩 스킵`);
      }
    }

    if (skippedGeocoding > 0) {
      console.log(`✅ 총 ${skippedGeocoding}개 단지의 지오코딩 스킵 (기존 DB 데이터 사용)`);
    }

    for (const complex of complexesToUpsert) {
      if (complex.latitude && complex.longitude && !complex.beopjungdong) {
        try {
          // 내부 geocode API 호출
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const geocodeUrl = `${baseUrl}/api/geocode?latitude=${complex.latitude}&longitude=${complex.longitude}`;

          const geocodeRes = await fetch(geocodeUrl);
          const geocodeData = await geocodeRes.json();

          if (geocodeData.success && geocodeData.data) {
            complex.beopjungdong = geocodeData.data.beopjungdong || null;
            complex.haengjeongdong = geocodeData.data.haengjeongdong || null;
            complex.sidoCode = geocodeData.data.sidoCode || null;
            complex.sigunguCode = geocodeData.data.sigunguCode || null;
            complex.dongCode = geocodeData.data.dongCode || null;

            // 주소 정보도 업데이트 (기존 address가 없는 경우)
            if (!complex.address && geocodeData.data.fullAddress) {
              complex.address = geocodeData.data.fullAddress;
            }

            console.log(`✅ Geocoded: ${complex.complexName} → ${complex.beopjungdong} (법정동코드: ${geocodeData.data.lawdCd})`);
          }
        } catch (err: any) {
          console.error(`[Geocoding Error] Failed for complex ${complex.complexNo} (${complex.complexName}):`, err.message);
          // 역지오코딩 실패는 치명적이지 않으므로 계속 진행
        }

        // Rate limiting 방지 (SGIS API 호출 제한)
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Batch upsert complexes
    await prisma.crawlHistory.update({
      where: { id: crawlId },
      data: {
        currentStep: 'Saving complex information',
      },
    });

    for (const complexData of complexesToUpsert) {
      // update 시에는 userId 제외 (기존 사용자 유지)
      const { userId, ...updateData } = complexData;

      const complex = await prisma.complex.upsert({
        where: { complexNo: complexData.complexNo },
        update: updateData, // userId 제외한 나머지만 업데이트
        create: complexData, // 신규 생성 시에는 userId 포함
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

      // complexNo 가져오기 (동일한 fallback 로직)
      const complexNo = overview.complexNo || data.crawling_info?.complex_no;
      if (!complexNo) continue;

      const complexId = complexNoToIdMap.get(complexNo);

      if (!complexId) {
        logger.error(`Complex ID not found for ${complexNo}`);
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
          // ✅ 추가: 숫자 가격 컬럼 (성능 최적화용)
          dealOrWarrantPrcWon: parsePriceToWonBigInt(article.dealOrWarrantPrc),
          rentPrcWon: article.rentPrc ? parsePriceToWonBigInt(article.rentPrc) : null,
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let crawlId: string | null = null;

  try {
    // 🔒 중복 크롤링 방지: 이미 크롤링 진행 중인 경우 거부
    if (isCurrentlyCrawling) {
      logger.warn('Crawl request rejected: Another crawl is already in progress', {
        currentCrawlId,
      });
      return NextResponse.json(
        {
          error: '이미 크롤링이 진행 중입니다. 완료 후 다시 시도해주세요.',
          currentCrawlId,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // 내부 스케줄러 호출 확인 (특별한 헤더로 식별)
    const internalSecret = request.headers.get('x-internal-secret');
    const isInternalCall = internalSecret === process.env.INTERNAL_API_SECRET;

    // Rate Limiting (내부 호출이 아닌 경우만)
    if (!isInternalCall) {
      const rateLimitResponse = rateLimit(request, rateLimitPresets.crawl);
      if (rateLimitResponse) return rateLimitResponse;
    }

    const body = await request.json();
    const {
      complexNumbers,
      userId: requestUserId,
      initiator = 'manual',  // manual, schedule, api, complex-detail
      scheduleId,
      scheduleName,
    } = body;

    // 사용자 인증 확인 (내부 호출이 아닌 경우)
    let currentUser;
    if (isInternalCall) {
      // 내부 호출: body에서 전달된 userId 사용
      if (!requestUserId) {
        return NextResponse.json(
          { error: 'Internal call requires userId' },
          { status: 400 }
        );
      }
      const user = await prisma.user.findUnique({ where: { id: requestUserId } });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      currentUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    } else {
      // 외부 호출: 세션 인증 필요
      currentUser = await requireAuth();
    }

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

    // Generate unique crawl ID
    crawlId = `crawl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    currentCrawlId = crawlId;
    isCurrentlyCrawling = true; // 🔒 크롤링 시작 플래그 설정

    // 🔔 실시간 알림: 크롤링 시작
    eventBroadcaster.notifyCrawlStart(crawlId, complexNosArray.length);

    logger.info('Starting crawler workflow', { crawlId, complexNos: complexNosArray.length });

    // 스케줄 실행인 경우: crawlId만 반환하고 백그라운드에서 크롤링 실행
    if (initiator === 'schedule') {
      console.log(`📤 Returning crawlId immediately for schedule execution: ${crawlId}`);

      // Import workflow service
      const { executeCrawlWorkflow } = await import('@/services/crawl-workflow');

      // 백그라운드에서 크롤링 실행 (await 없이)
      executeCrawlWorkflow({
        crawlId,
        complexNos: complexNosArray,
        userId: currentUser.id,
        scheduleId: scheduleId || null,
      })
        .then(() => {
          currentCrawlId = null;
          isCurrentlyCrawling = false;
        })
        .catch((error) => {
          logger.error('Background crawl failed', { crawlId, error: error.message });
          currentCrawlId = null;
          isCurrentlyCrawling = false;
        });

      // 즉시 crawlId 반환
      return NextResponse.json({
        success: true,
        crawlId,
        message: 'Crawl started in background',
      });
    }

    // Import workflow service
    const { executeCrawlWorkflow } = await import('@/services/crawl-workflow');

    // Execute complete crawl workflow
    const result = await executeCrawlWorkflow({
      crawlId,
      complexNos: complexNosArray,
      userId: currentUser.id,
      scheduleId: scheduleId || null,
    });

    currentCrawlId = null;
    isCurrentlyCrawling = false; // 🔓 크롤링 완료 플래그 해제

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? '크롤링이 완료되고 데이터베이스에 저장되었습니다.'
        : '크롤링 중 일부 오류가 발생했습니다.',
      crawlId: result.crawlId,
      data: {
        complexes: result.totalComplexes,
        articles: result.totalArticles,
        duration: Math.floor(result.duration / 1000),
        errors: result.errors,
        status: result.status,
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
      } catch (historyError: any) {
        logger.error('Failed to update error history', historyError);
      }
    }

    currentCrawlId = null;
    isCurrentlyCrawling = false; // 🔓 에러 발생 시에도 플래그 해제

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

// 스케줄 크롤링 완료 알림 전송
async function sendScheduleCrawlCompleteNotification(
  scheduleId: string,
  dbResult: { totalComplexes: number; totalArticles: number; errors: string[] },
  duration: number
) {
  try {
    // 스케줄 정보 조회
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        user: true,
      },
    });

    if (!schedule) {
      logger.warn('Schedule not found for notification', { scheduleId });
      return;
    }

    // 사용자의 알림 설정 확인 (활성화된 알림이 있고 webhookUrl이 있는 경우)
    const userAlerts = await prisma.alert.findMany({
      where: {
        userId: schedule.userId,
        isActive: true,
        webhookUrl: { not: null },
      },
      take: 1, // 하나만 있으면 됨 (webhookUrl 가져오기 위해)
    });

    if (userAlerts.length === 0) {
      logger.info('No active alerts with webhook URL for schedule notification', { scheduleId });
      return;
    }

    const webhookUrl = userAlerts[0].webhookUrl!;

    // Discord 임베드 생성
    const embed = {
      title: '⏰ 스케줄 크롤링 완료',
      description: `**${schedule.name}** 스케줄이 완료되었습니다.`,
      color: dbResult.errors.length > 0 ? 0xfbbf24 : 0x10b981, // 에러 있으면 노란색, 없으면 초록색
      fields: [
        {
          name: '📊 크롤링 결과',
          value: `• 단지 수: ${dbResult.totalComplexes}개\n• 매물 수: ${dbResult.totalArticles}개\n• 소요 시간: ${Math.floor(duration / 1000)}초`,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Schedule ID: ${scheduleId.substring(0, 8)}`,
      },
    };

    // 에러가 있으면 추가
    if (dbResult.errors.length > 0) {
      embed.fields.push({
        name: '⚠️ 일부 오류 발생',
        value: dbResult.errors.slice(0, 3).join('\n') + (dbResult.errors.length > 3 ? `\n... 외 ${dbResult.errors.length - 3}개` : ''),
        inline: false,
      });
    }

    // Discord 웹훅 전송
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      logger.error('Failed to send schedule completion notification to Discord', {
        status: response.status,
        statusText: response.statusText,
      });
    } else {
      logger.info('Schedule completion notification sent successfully', { scheduleId });
    }
  } catch (error: any) {
    logger.error('Error sending schedule completion notification', error);
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
