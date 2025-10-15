/**
 * 스케줄러 디버깅 API
 * GET: 스케줄러 상태 및 디버깅 정보 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getActiveSchedules } from '@/lib/scheduler';

const prisma = new PrismaClient();

/**
 * GET /api/schedules/debug - 스케줄러 디버깅 정보
 */
export async function GET(request: NextRequest) {
  try {
    // 1. DB에서 활성 스케줄 조회
    const activeSchedulesInDB = await prisma.schedule.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        cronExpr: true,
        isActive: true,
        lastRun: true,
        nextRun: true,
        complexNos: true,
        createdAt: true,
      },
    });

    // 2. 메모리에 등록된 스케줄 조회
    const activeSchedulesInMemory = getActiveSchedules();

    // 3. 스케줄 로그 조회 (최근 10개)
    const recentLogs = await prisma.scheduleLog.findMany({
      take: 10,
      orderBy: {
        executedAt: 'desc',
      },
      include: {
        schedule: {
          select: {
            name: true,
          },
        },
      },
    });

    // 4. 시스템 시간 정보
    const now = new Date();
    const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    // 5. 스케줄 매칭 검사
    const scheduleMatches = activeSchedulesInDB.map(schedule => {
      const isInMemory = activeSchedulesInMemory.includes(schedule.id);
      return {
        id: schedule.id,
        name: schedule.name,
        cronExpr: schedule.cronExpr,
        isActive: schedule.isActive,
        isRegisteredInMemory: isInMemory,
        lastRun: schedule.lastRun,
        nextRun: schedule.nextRun,
        complexCount: schedule.complexNos.length,
        createdAt: schedule.createdAt,
      };
    });

    // 6. 환경 정보
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      nextRuntime: process.env.NEXT_RUNTIME,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      kstTime: kstTime.toISOString(),
      summary: {
        activeSchedulesInDB: activeSchedulesInDB.length,
        registeredInMemory: activeSchedulesInMemory.length,
        recentLogsCount: recentLogs.length,
      },
      schedules: scheduleMatches,
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        scheduleName: log.schedule.name,
        status: log.status,
        duration: log.duration,
        articlesCount: log.articlesCount,
        errorMessage: log.errorMessage,
        executedAt: log.executedAt,
      })),
      environment: envInfo,
      memorySchedules: activeSchedulesInMemory,
    });
  } catch (error: any) {
    console.error('Failed to get scheduler debug info:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get debug info',
      },
      { status: 500 }
    );
  }
}
