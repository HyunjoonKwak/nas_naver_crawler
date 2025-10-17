/**
 * 스케줄 관리 API
 * GET: 스케줄 목록 조회
 * POST: 새 스케줄 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import {
  registerSchedule,
  unregisterSchedule,
  validateCronExpression,
  getNextRunTime,
} from '@/lib/scheduler';
import cronstrue from 'cronstrue/i18n';

/**
 * GET /api/schedules - 스케줄 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const schedules = await prisma.schedule.findMany({
      where: {
        userId: currentUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        logs: {
          take: 10,
          orderBy: {
            executedAt: 'desc',
          },
        },
      },
    });

    // 각 스케줄의 단지 정보 조회
    const schedulesWithComplexInfo = await Promise.all(
      schedules.map(async (schedule) => {
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

        // Cron 표현식을 한글로 변환
        let cronDescription = schedule.cronExpr;
        try {
          cronDescription = cronstrue.toString(schedule.cronExpr, {
            locale: 'ko',
          });
        } catch (error) {
          console.error('Failed to parse cron expression:', error);
        }

        return {
          ...schedule,
          complexes,
          cronDescription,
        };
      })
    );

    return NextResponse.json({
      success: true,
      schedules: schedulesWithComplexInfo,
    });
  } catch (error: any) {
    console.error('Failed to fetch schedules:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch schedules',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/schedules - 새 스케줄 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const body = await request.json();

    const { name, complexNos, cronExpr } = body;

    // 필수 필드 검증
    if (!name || !complexNos || complexNos.length === 0 || !cronExpr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, complexes, and cron expression are required',
        },
        { status: 400 }
      );
    }

    // Cron 표현식 검증
    if (!validateCronExpression(cronExpr)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid cron expression',
        },
        { status: 400 }
      );
    }

    // 다음 실행 시간 계산
    const nextRun = getNextRunTime(cronExpr);
    if (!nextRun) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to calculate next run time',
        },
        { status: 400 }
      );
    }

    // 스케줄 생성
    const schedule = await prisma.schedule.create({
      data: {
        name,
        complexNos,
        cronExpr,
        isActive: true,
        nextRun,
        userId: currentUser.id,
      },
    });

    // Cron Job 등록
    const registered = registerSchedule(schedule.id, cronExpr, complexNos);

    if (!registered) {
      // 등록 실패 시 DB에서도 삭제
      await prisma.schedule.delete({
        where: { id: schedule.id },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to register cron job',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (error: any) {
    console.error('Failed to create schedule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create schedule',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedules - 스케줄 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule ID is required',
        },
        { status: 400 }
      );
    }

    // Cron Job 제거
    unregisterSchedule(id);

    // DB에서 삭제 (본인 것만)
    await prisma.schedule.delete({
      where: {
        id,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete schedule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete schedule',
      },
      { status: 500 }
    );
  }
}
