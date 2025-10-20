/**
 * 스케줄 크롤링 실행 엔진
 * node-cron 기반 자동 크롤링
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { eventBroadcaster } from './eventBroadcaster';
import { calculateDynamicTimeout } from './timeoutCalculator';

const prisma = new PrismaClient();

// 활성화된 Cron Job들을 저장하는 맵
const activeCronJobs = new Map<string, cron.ScheduledTask>();

/**
 * 다음 실행 시간 계산
 */
export function getNextRunTime(cronExpr: string): Date | null {
  try {
    // cron 표현식이 유효한지 검증
    if (!cron.validate(cronExpr)) {
      console.error(`Invalid cron expression: ${cronExpr}`);
      return null;
    }

    const parts = cronExpr.split(' ');
    if (parts.length !== 5) {
      console.error(`Invalid cron format: ${cronExpr}`);
      return null;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 현재 UTC 시간
    const now = new Date();

    // KST 시간 계산 (UTC + 9시간)
    const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    // 다음 실행 시간을 KST 기준으로 계산
    let next = new Date(kstTime);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // 분 설정
    if (minute !== '*') {
      const targetMinute = parseInt(minute);
      next.setMinutes(targetMinute);

      if (next <= kstTime) {
        next.setHours(next.getHours() + 1);
      }
    } else {
      next.setMinutes(next.getMinutes() + 1);
    }

    // 시간 설정
    if (hour !== '*') {
      const targetHour = parseInt(hour);
      next.setHours(targetHour);

      if (next <= kstTime) {
        next.setDate(next.getDate() + 1);
      }
    }

    // 요일 설정 (0=일요일, 6=토요일)
    if (dayOfWeek !== '*') {
      const targetDays = dayOfWeek.split(',').map(d => parseInt(d));
      let currentDay = next.getDay();

      if (!targetDays.includes(currentDay) || next <= kstTime) {
        let daysToAdd = 1;
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (targetDays.includes(checkDay)) {
            daysToAdd = i;
            break;
          }
        }
        next.setDate(next.getDate() + daysToAdd);

        // 요일이 바뀌면 시간을 다시 설정
        if (hour !== '*') {
          next.setHours(parseInt(hour));
        }
        if (minute !== '*') {
          next.setMinutes(parseInt(minute));
        }
      }
    }

    // next는 KST 시간이므로, 이를 UTC로 변환
    // KST 로컬 시간을 UTC ISO 문자열로 변환
    const year = next.getFullYear();
    const monthNum = next.getMonth();
    const date = next.getDate();
    const hours = next.getHours();
    const minutes = next.getMinutes();

    // KST 시간을 UTC로 변환 (KST - 9시간 = UTC)
    const utcNext = new Date(Date.UTC(year, monthNum, date, hours, minutes) - 9 * 60 * 60 * 1000);

    return utcNext;
  } catch (error) {
    console.error('Failed to calculate next run time:', error);
    return null;
  }
}

/**
 * 크롤링 실행 함수
 */
async function executeCrawl(scheduleId: string) {
  const startTime = Date.now();

  // 스케줄 정보 조회
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    console.error(`❌ Schedule not found: ${scheduleId}`);
    return;
  }

  // 🔒 중복 실행 방지: 이미 실행 중인 크롤링이 있는지 확인
  const runningCrawl = await prisma.crawlHistory.findFirst({
    where: {
      scheduleId: scheduleId,
      status: { in: ['pending', 'running'] },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (runningCrawl) {
    console.warn(`⚠️  Schedule "${schedule.name}" is already running!`);
    console.warn(`   Crawl ID: ${runningCrawl.id}`);
    console.warn(`   Started at: ${runningCrawl.startedAt}`);
    console.warn(`   Status: ${runningCrawl.status}`);
    console.warn(`   Skipping duplicate execution.`);
    return;
  }

  const scheduleName = schedule.name;
  let complexNos: string[] = [];

  // 관심단지 실시간 조회 vs 고정 단지 목록
  if (schedule.useBookmarkedComplexes) {
    console.log(`🔖 Using bookmarked complexes for schedule: ${scheduleName}`);

    // 사용자의 관심단지(즐겨찾기) 조회
    const favorites = await prisma.favorite.findMany({
      where: { userId: schedule.userId },
      include: {
        complex: {
          select: {
            complexNo: true,
            complexName: true,
          },
        },
      },
    });

    complexNos = favorites.map(f => f.complex.complexNo);

    if (complexNos.length === 0) {
      console.warn(`⚠️  No bookmarked complexes found for user ${schedule.userId}`);
      console.warn(`   Skipping scheduled crawl: ${scheduleName}`);
      return;
    }

    console.log(`   Found ${complexNos.length} bookmarked complexes:`);
    favorites.forEach(f => {
      console.log(`     - ${f.complex.complexName} (${f.complex.complexNo})`);
    });
  } else {
    console.log(`📌 Using fixed complexes for schedule: ${scheduleName}`);
    complexNos = schedule.complexNos;

    if (complexNos.length === 0) {
      console.warn(`⚠️  No complexes configured for schedule: ${scheduleName}`);
      return;
    }

    console.log(`   Using ${complexNos.length} fixed complexes`);
  }

  try {
    console.log(`🚀 Executing scheduled crawl: ${scheduleId}`);
    console.log(`   Schedule name: ${scheduleName}`);
    console.log(`   Complexes: ${complexNos.join(', ')}`);

    // 동적 타임아웃 계산
    const dynamicTimeout = await calculateDynamicTimeout(complexNos.length);

    // SSE: 스케줄 크롤링 시작 알림
    console.log(`   [SSE] Broadcasting schedule-start event`);
    eventBroadcaster.notifyScheduleStart(scheduleId, scheduleName, complexNos.length);

    // 크롤링 API 호출 (동적 타임아웃)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), dynamicTimeout);

    let crawlId: string | null = null;

    try {
      const response = await fetch(`${baseUrl}/api/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET || 'default-secret-change-me',
        },
        body: JSON.stringify({
          complexNumbers: complexNos,
          userId: schedule.userId, // 스케줄 소유자의 userId 전달
          initiator: 'schedule',
          scheduleId: schedule.id,
          scheduleName: schedule.name,
        }),
        signal: controller.signal,
        // @ts-ignore - undici specific options
        headersTimeout: dynamicTimeout + 120000, // +2분 버퍼 추가
        bodyTimeout: dynamicTimeout + 120000,    // +2분 버퍼 추가
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok && data.crawlId) {
        crawlId = data.crawlId;
        console.log(`📝 Crawl started with ID: ${crawlId}`);
      } else if (response.ok) {
        // 동기 응답인 경우
        const duration = Date.now() - startTime;
        const articlesCount = data.data?.articles || 0;
        console.log(`✅ Scheduled crawl completed: ${scheduleId}`);
        console.log(`   Duration: ${Math.floor(duration / 1000)}s`);
        console.log(`   Articles: ${articlesCount}`);

        await updateScheduleSuccess(scheduleId, scheduleName, duration, articlesCount);
        return;
      } else {
        throw new Error(data.error || 'Crawl failed');
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // fetch 실패 시에도 크롤링이 백그라운드에서 진행 중일 수 있음
      // CrawlHistory에서 최근 크롤링 확인
      console.warn(`⚠️ Fetch failed, checking crawl history...`, fetchError.message);

      // 5초 대기 후 크롤링 히스토리 확인 (크롤링이 DB에 기록될 시간 확보)
      await new Promise(resolve => setTimeout(resolve, 5000));

      const recentCrawl = await checkRecentCrawlHistory(complexNos, dynamicTimeout);

      if (recentCrawl) {
        // 크롤링이 실제로 성공한 경우
        const duration = Date.now() - startTime;
        console.log(`✅ Scheduled crawl completed (verified from history): ${scheduleId}`);
        console.log(`   Duration: ${Math.floor(duration / 1000)}s`);
        console.log(`   Articles: ${recentCrawl.totalArticles}`);

        await updateScheduleSuccess(scheduleId, scheduleName, duration, recentCrawl.totalArticles);
        return;
      }

      throw fetchError;
    }

    // crawlId가 있으면 폴링으로 완료 대기
    if (crawlId) {
      const result = await pollCrawlStatus(crawlId, dynamicTimeout);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ Scheduled crawl completed: ${scheduleId}`);
        console.log(`   Duration: ${Math.floor(duration / 1000)}s`);
        console.log(`   Articles: ${result.articlesCount}`);

        await updateScheduleSuccess(scheduleId, scheduleName, duration, result.articlesCount);
      } else {
        throw new Error(result.error || 'Crawl failed');
      }
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Scheduled crawl failed: ${scheduleId}`, error);

    // SSE: 스케줄 크롤링 실패 알림
    console.log(`   [SSE] Broadcasting schedule-failed event`);
    eventBroadcaster.notifyScheduleFailed(scheduleId, scheduleName, error.message || 'Unknown error');

    // 실패 로그 저장
    console.log(`   [DB] Saving failure log to ScheduleLog table`);
    try {
      await prisma.scheduleLog.create({
        data: {
          scheduleId,
          status: 'failed',
          duration: Math.floor(duration / 1000),
          articlesCount: 0,
          errorMessage: error.message || 'Unknown error',
        },
      });
      console.log(`   [DB] ✓ Failure log saved successfully`);
    } catch (dbError: any) {
      console.error(`   [DB] ✗ Failed to save failure log:`, dbError);
    }
  }
}

/**
 * 스케줄 성공 업데이트 헬퍼 함수
 */
async function updateScheduleSuccess(
  scheduleId: string,
  scheduleName: string,
  duration: number,
  articlesCount: number
) {
  console.log(`   [DB] Updating schedule success...`);

  // 스케줄 정보 조회
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    console.error(`   [DB] ✗ Schedule not found: ${scheduleId}`);
    return;
  }

  // 다음 실행 시간 계산
  const nextRun = getNextRunTime(schedule.cronExpr);
  const now = new Date();

  console.log(`   [DB] Next run calculated: ${nextRun ? nextRun.toISOString() : 'null'}`);

  // 스케줄 업데이트 (lastRun, nextRun)
  try {
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        lastRun: now,
        nextRun,
      },
    });
    console.log(`   [DB] ✓ Schedule updated (lastRun, nextRun)`);
  } catch (updateError: any) {
    console.error(`   [DB] ✗ Failed to update schedule:`, updateError);
  }

  // 성공 로그 저장
  console.log(`   [DB] Saving success log to ScheduleLog table`);
  try {
    const log = await prisma.scheduleLog.create({
      data: {
        scheduleId,
        status: 'success',
        duration: Math.floor(duration / 1000),
        articlesCount: articlesCount,
      },
    });
    console.log(`   [DB] ✓ Success log saved with ID: ${log.id}`);
  } catch (logError: any) {
    console.error(`   [DB] ✗ Failed to save success log:`, logError);
  }

  // SSE: 스케줄 크롤링 완료 알림
  console.log(`   [SSE] Broadcasting schedule-complete event`);
  eventBroadcaster.notifyScheduleComplete(scheduleId, scheduleName, articlesCount, duration);
}

/**
 * 최근 크롤링 히스토리 확인 (fetch 실패 시 백업 확인용)
 */
async function checkRecentCrawlHistory(complexNos: string[], lookbackTimeout: number): Promise<{ totalArticles: number } | null> {
  try {
    // 동적 타임아웃 + 5분 여유를 두고 크롤링 히스토리 조회
    const lookbackMs = lookbackTimeout + (5 * 60 * 1000); // 타임아웃 + 5분
    const lookbackTime = new Date(Date.now() - lookbackMs);

    const recentCrawl = await prisma.crawlHistory.findFirst({
      where: {
        createdAt: {
          gte: lookbackTime,
        },
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentCrawl && recentCrawl.totalArticles > 0) {
      return {
        totalArticles: recentCrawl.totalArticles,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to check crawl history:', error);
    return null;
  }
}

/**
 * 크롤링 상태 폴링
 */
async function pollCrawlStatus(crawlId: string, timeout: number): Promise<{ success: boolean; articlesCount: number; error?: string }> {
  const startTime = Date.now();
  const checkInterval = 2000; // 2초마다 체크

  while (Date.now() - startTime < timeout) {
    try {
      const crawlHistory = await prisma.crawlHistory.findUnique({
        where: { id: crawlId },
      });

      if (crawlHistory) {
        if (crawlHistory.status === 'success' || crawlHistory.status === 'partial' || crawlHistory.status === 'completed') {
          return {
            success: true,
            articlesCount: crawlHistory.totalArticles,
          };
        } else if (crawlHistory.status === 'failed') {
          return {
            success: false,
            articlesCount: 0,
            error: crawlHistory.errorMessage || 'Crawl failed',
          };
        }
      }

      // 아직 진행 중이면 대기
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.error('Failed to poll crawl status:', error);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  return {
    success: false,
    articlesCount: 0,
    error: 'Timeout waiting for crawl to complete',
  };
}

/**
 * 스케줄 등록
 */
export function registerSchedule(
  scheduleId: string,
  cronExpr: string
): boolean {
  try {
    // 기존 스케줄이 있으면 제거
    if (activeCronJobs.has(scheduleId)) {
      console.log(`   Removing existing schedule: ${scheduleId}`);
      const existingJob = activeCronJobs.get(scheduleId);
      existingJob?.stop();
      activeCronJobs.delete(scheduleId);
    }

    // Cron 표현식 검증
    if (!cron.validate(cronExpr)) {
      console.error(`   ❌ Invalid cron expression: ${cronExpr}`);
      return false;
    }

    // Cron Job 생성
    console.log(`   Creating cron job with timezone: Asia/Seoul`);
    const task = cron.schedule(
      cronExpr,
      () => {
        console.log(`🚀 Cron job triggered for schedule: ${scheduleId}`);
        executeCrawl(scheduleId);
      },
      {
        scheduled: true,
        timezone: 'Asia/Seoul',
      }
    );

    activeCronJobs.set(scheduleId, task);
    console.log(`   ✅ Schedule registered in memory: ${scheduleId}`);
    console.log(`   Active cron jobs count: ${activeCronJobs.size}`);

    return true;
  } catch (error) {
    console.error(`   ❌ Failed to register schedule ${scheduleId}:`, error);
    return false;
  }
}

/**
 * 스케줄 제거
 */
export function unregisterSchedule(scheduleId: string): boolean {
  try {
    const job = activeCronJobs.get(scheduleId);
    if (job) {
      job.stop();
      activeCronJobs.delete(scheduleId);
      console.log(`✅ Schedule unregistered: ${scheduleId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to unregister schedule ${scheduleId}:`, error);
    return false;
  }
}

/**
 * 모든 활성 스케줄 로드 (서버 시작 시)
 */
export async function loadAllSchedules() {
  try {
    console.log('📅 Loading all active schedules...');
    console.log(`   Current time: ${new Date().toISOString()}`);
    console.log(`   KST time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })}`);

    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
      },
    });

    console.log(`   Found ${schedules.length} active schedule(s) in DB`);

    let loadedCount = 0;
    for (const schedule of schedules) {
      console.log(`   Registering schedule: "${schedule.name}" (${schedule.id})`);
      console.log(`     Cron: ${schedule.cronExpr}`);
      console.log(`     Mode: ${schedule.useBookmarkedComplexes ? 'Bookmarked' : 'Fixed'}`);
      if (!schedule.useBookmarkedComplexes) {
        console.log(`     Complexes: ${schedule.complexNos.length} items`);
      }

      const success = registerSchedule(
        schedule.id,
        schedule.cronExpr
      );

      if (success) {
        loadedCount++;
        console.log(`     ✓ Successfully registered`);
      } else {
        console.log(`     ✗ Failed to register`);
      }

      // nextRun 업데이트
      const nextRun = getNextRunTime(schedule.cronExpr);
      console.log(`     Next run: ${nextRun ? nextRun.toISOString() : 'null'}`);

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { nextRun },
      });
    }

    console.log(`✅ Loaded ${loadedCount}/${schedules.length} active schedule(s)`);
    return loadedCount;
  } catch (error) {
    console.error('❌ Failed to load schedules:', error);
    return 0;
  }
}

/**
 * 특정 스케줄 즉시 실행
 * @returns true: 성공, false: 실패, 'already_running': 이미 실행 중
 */
export async function runScheduleNow(scheduleId: string): Promise<boolean | 'already_running'> {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      console.error(`Schedule not found: ${scheduleId}`);
      return false;
    }

    // 🔒 중복 실행 방지: 이미 실행 중인지 확인
    const runningCrawl = await prisma.crawlHistory.findFirst({
      where: {
        scheduleId: scheduleId,
        status: { in: ['pending', 'running'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (runningCrawl) {
      console.warn(`⚠️  Schedule "${schedule.name}" is already running (checked in runScheduleNow)`);
      console.warn(`   Crawl ID: ${runningCrawl.id}`);
      console.warn(`   Returning 'already_running' to caller`);
      return 'already_running';
    }

    console.log(`▶️ Running schedule immediately: ${schedule.name}`);
    await executeCrawl(scheduleId);
    return true;
  } catch (error) {
    console.error(`Failed to run schedule ${scheduleId}:`, error);
    return false;
  }
}

/**
 * 활성 스케줄 목록 조회
 */
export function getActiveSchedules(): string[] {
  return Array.from(activeCronJobs.keys());
}

/**
 * Cron 표현식 검증
 */
export function validateCronExpression(cronExpr: string): boolean {
  return cron.validate(cronExpr);
}
