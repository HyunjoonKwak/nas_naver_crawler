/**
 * 스케줄 크롤링 실행 엔진
 * node-cron 기반 자동 크롤링
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 활성화된 Cron Job들을 저장하는 맵
const activeCronJobs = new Map<string, cron.ScheduledTask>();

/**
 * 다음 실행 시간 계산
 */
function getNextRunTime(cronExpr: string): Date | null {
  try {
    // cron 표현식이 유효한지 검증
    if (!cron.validate(cronExpr)) {
      console.error(`Invalid cron expression: ${cronExpr}`);
      return null;
    }

    // 다음 실행 시간 계산 (간단한 방법)
    const now = new Date();
    const parts = cronExpr.split(' ');

    // 기본적인 계산 (실제로는 더 복잡하지만, 대략적인 추정)
    // node-cron은 다음 실행 시간을 직접 제공하지 않으므로 대략적으로 계산

    // 매 분: * * * * *
    if (parts[0] === '*') {
      now.setMinutes(now.getMinutes() + 1);
      return now;
    }

    // 특정 분: 30 * * * * (매시 30분)
    const minute = parseInt(parts[0]);
    if (!isNaN(minute)) {
      now.setMinutes(minute);
      if (now < new Date()) {
        now.setHours(now.getHours() + 1);
      }
      return now;
    }

    // 기본값: 1시간 후
    now.setHours(now.getHours() + 1);
    return now;
  } catch (error) {
    console.error('Failed to calculate next run time:', error);
    return null;
  }
}

/**
 * 크롤링 실행 함수
 */
async function executeCrawl(scheduleId: string, complexNos: string[]) {
  const startTime = Date.now();

  try {
    console.log(`🚀 Executing scheduled crawl: ${scheduleId}`);
    console.log(`   Complexes: ${complexNos.join(', ')}`);

    // 크롤링 API 호출
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        complexNumbers: complexNos,
      }),
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (response.ok) {
      const articlesCount = data.data?.articles || 0;
      console.log(`✅ Scheduled crawl completed: ${scheduleId}`);
      console.log(`   Duration: ${Math.floor(duration / 1000)}s`);
      console.log(`   Articles: ${articlesCount}`);
      console.log(`   Response data:`, JSON.stringify(data, null, 2));

      // 성공 로그 저장
      await prisma.scheduleLog.create({
        data: {
          scheduleId,
          status: 'success',
          duration: Math.floor(duration / 1000),
          articlesCount: articlesCount,
        },
      });

      // 스케줄 업데이트 (lastRun, nextRun)
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
      });

      if (schedule) {
        const nextRun = getNextRunTime(schedule.cronExpr);
        await prisma.schedule.update({
          where: { id: scheduleId },
          data: {
            lastRun: new Date(),
            nextRun,
          },
        });
      }
    } else {
      throw new Error(data.error || 'Crawl failed');
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Scheduled crawl failed: ${scheduleId}`, error);

    // 실패 로그 저장
    await prisma.scheduleLog.create({
      data: {
        scheduleId,
        status: 'failed',
        duration: Math.floor(duration / 1000),
        articlesCount: 0,
        errorMessage: error.message || 'Unknown error',
      },
    });
  }
}

/**
 * 스케줄 등록
 */
export function registerSchedule(
  scheduleId: string,
  cronExpr: string,
  complexNos: string[]
): boolean {
  try {
    // 기존 스케줄이 있으면 제거
    if (activeCronJobs.has(scheduleId)) {
      const existingJob = activeCronJobs.get(scheduleId);
      existingJob?.stop();
      activeCronJobs.delete(scheduleId);
    }

    // Cron 표현식 검증
    if (!cron.validate(cronExpr)) {
      console.error(`Invalid cron expression: ${cronExpr}`);
      return false;
    }

    // Cron Job 생성
    const task = cron.schedule(
      cronExpr,
      () => {
        executeCrawl(scheduleId, complexNos);
      },
      {
        scheduled: true,
        timezone: 'Asia/Seoul',
      }
    );

    activeCronJobs.set(scheduleId, task);
    console.log(`✅ Schedule registered: ${scheduleId} (${cronExpr})`);

    return true;
  } catch (error) {
    console.error(`Failed to register schedule ${scheduleId}:`, error);
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

    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
      },
    });

    let loadedCount = 0;
    for (const schedule of schedules) {
      const success = registerSchedule(
        schedule.id,
        schedule.cronExpr,
        schedule.complexNos
      );
      if (success) loadedCount++;

      // nextRun 업데이트
      const nextRun = getNextRunTime(schedule.cronExpr);
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { nextRun },
      });
    }

    console.log(`✅ Loaded ${loadedCount} active schedule(s)`);
    return loadedCount;
  } catch (error) {
    console.error('Failed to load schedules:', error);
    return 0;
  }
}

/**
 * 특정 스케줄 즉시 실행
 */
export async function runScheduleNow(scheduleId: string): Promise<boolean> {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      console.error(`Schedule not found: ${scheduleId}`);
      return false;
    }

    console.log(`▶️ Running schedule immediately: ${schedule.name}`);
    await executeCrawl(scheduleId, schedule.complexNos);
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
