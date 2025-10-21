/**
 * 스케줄 개별 관리 API
 * GET: 스케줄 상세 조회
 * PUT: 스케줄 수정
 * PATCH: 스케줄 활성화/비활성화
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import {

export const dynamic = 'force-dynamic';
  registerSchedule,
  unregisterSchedule,
  validateCronExpression,
  getNextRunTime,
} from '@/lib/scheduler';


/**
 * GET /api/schedules/[id] - 스케줄 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: params.id },
      include: {
        logs: {
          take: 50,
          orderBy: {
            executedAt: 'desc',
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule not found',
        },
        { status: 404 }
      );
    }

    // 단지 정보 조회
    const complexes = await prisma.complex.findMany({
      where: {
        complexNo: {
          in: schedule.complexNos,
        },
      },
      select: {
        complexNo: true,
        complexName: true,
      },
    });

    return NextResponse.json({
      success: true,
      schedule: {
        ...schedule,
        complexes,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch schedule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch schedule',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/schedules/[id] - 스케줄 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, complexNos, cronExpr, useBookmarkedComplexes } = body;

    // Cron 표현식 검증
    if (cronExpr && !validateCronExpression(cronExpr)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid cron expression',
        },
        { status: 400 }
      );
    }

    // 스케줄 조회
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: params.id },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule not found',
        },
        { status: 404 }
      );
    }

    // 고정 모드로 변경 시 complexNos 필수 검증
    const finalUseBookmarked = useBookmarkedComplexes !== undefined
      ? useBookmarkedComplexes
      : existingSchedule.useBookmarkedComplexes;

    if (!finalUseBookmarked && (!complexNos || complexNos.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Complexes are required when not using bookmarked mode',
        },
        { status: 400 }
      );
    }

    // 다음 실행 시간 계산 (cronExpr이 변경된 경우)
    let nextRun = existingSchedule.nextRun;
    if (cronExpr && cronExpr !== existingSchedule.cronExpr) {
      const calculatedNextRun = getNextRunTime(cronExpr);
      if (!calculatedNextRun) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to calculate next run time',
          },
          { status: 400 }
        );
      }
      nextRun = calculatedNextRun;
    }

    // 스케줄 수정
    const schedule = await prisma.schedule.update({
      where: { id: params.id },
      data: {
        name,
        complexNos,
        useBookmarkedComplexes,
        cronExpr,
        nextRun,
      },
    });

    // Cron Job 재등록
    if (schedule.isActive) {
      unregisterSchedule(params.id);
      registerSchedule(params.id, schedule.cronExpr);
    }

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    console.error('Failed to update schedule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update schedule',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/schedules/[id] - 스케줄 활성화/비활성화
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'isActive field is required and must be boolean',
        },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: params.id },
    });

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule not found',
        },
        { status: 404 }
      );
    }

    // 스케줄 업데이트
    const updatedSchedule = await prisma.schedule.update({
      where: { id: params.id },
      data: { isActive },
    });

    // Cron Job 등록/해제
    if (isActive) {
      registerSchedule(params.id, schedule.cronExpr);
    } else {
      unregisterSchedule(params.id);
    }

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
    });
  } catch (error: any) {
    console.error('Failed to toggle schedule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to toggle schedule',
      },
      { status: 500 }
    );
  }
}
