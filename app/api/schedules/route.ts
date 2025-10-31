/**
 * 스케줄 관리 API
 * GET: 스케줄 목록 조회
 * POST: 새 스케줄 생성
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import {
  registerSchedule,
  unregisterSchedule,
  validateCronExpression,
  getNextRunTime,
} from '@/lib/scheduler';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';
import cronstrue from 'cronstrue/i18n';

const logger = createLogger('API_SCHEDULES');

export const dynamic = 'force-dynamic';

/**
 * GET /api/schedules - 스케줄 목록 조회
 */
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
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

  logger.info('Schedules fetched', { userId: currentUser.id, count: schedules.length });

  // 각 스케줄의 단지 정보 조회
  const schedulesWithComplexInfo = await Promise.all(
    schedules.map(async (schedule) => {
      let complexes: { complexNo: string; complexName: string }[] = [];

      if (schedule.useBookmarkedComplexes) {
        // 관심단지 모드: 사용자의 Favorite에서 조회
        const favorites = await prisma.favorite.findMany({
          where: {
            userId: currentUser.id,
          },
          include: {
            complex: {
              select: {
                complexNo: true,
                complexName: true,
              },
            },
          },
        });

        complexes = favorites.map(f => ({
          complexNo: f.complex.complexNo,
          complexName: f.complex.complexName,
        }));
      } else {
        // 고정 단지 모드: complexNos에서 조회
        complexes = await prisma.complex.findMany({
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
      }

      // Cron 표현식을 한글로 변환
      let cronDescription = schedule.cronExpr;
      try {
        cronDescription = cronstrue.toString(schedule.cronExpr, {
          locale: 'ko',
        });
      } catch (error: any) {
        logger.warn('Failed to parse cron expression', { cronExpr: schedule.cronExpr, error: error.message });
      }

      return {
        ...schedule,
        complexes,
        cronDescription,
        // lastRun은 이미 schedule 객체에 포함되어 있음
      };
    })
  );

  return ApiResponseHelper.success({
    success: true,
    schedules: schedulesWithComplexInfo,
  });
});

/**
 * POST /api/schedules - 새 스케줄 생성
 */
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const body = await request.json();

  const { name, complexNos, cronExpr, useBookmarkedComplexes = true } = body;

  // 필수 필드 검증
  if (!name || !cronExpr) {
    throw new ApiError(ErrorType.VALIDATION, 'Name and cron expression are required', 400);
  }

  // 고정 모드일 때는 complexNos 필수
  if (!useBookmarkedComplexes && (!complexNos || complexNos.length === 0)) {
    throw new ApiError(ErrorType.VALIDATION, 'Complexes are required when not using bookmarked mode', 400);
  }

  // Cron 표현식 검증
  if (!validateCronExpression(cronExpr)) {
    throw new ApiError(ErrorType.VALIDATION, 'Invalid cron expression', 400);
  }

  // 다음 실행 시간 계산
  const nextRun = getNextRunTime(cronExpr);
  if (!nextRun) {
    throw new ApiError(ErrorType.VALIDATION, 'Failed to calculate next run time', 400);
  }

  // 스케줄 생성
  const schedule = await prisma.schedule.create({
    data: {
      name,
      complexNos: complexNos || [],
      useBookmarkedComplexes,
      cronExpr,
      isActive: true,
      nextRun,
      userId: currentUser.id,
    },
  });

  logger.info('Schedule created', { scheduleId: schedule.id, name, cronExpr, userId: currentUser.id });

  // Cron Job 등록
  const registered = registerSchedule(schedule.id, cronExpr);

  if (!registered) {
    // 등록 실패 시 DB에서도 삭제
    await prisma.schedule.delete({
      where: { id: schedule.id },
    });

    logger.error('Failed to register cron job', { scheduleId: schedule.id });
    throw new ApiError(ErrorType.INTERNAL, 'Failed to register cron job', 500);
  }

  return ApiResponseHelper.success({
    success: true,
    schedule,
  }, 'Schedule created successfully');
});

/**
 * DELETE /api/schedules - 스케줄 삭제
 */
export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(ErrorType.VALIDATION, 'Schedule ID is required', 400);
  }

  logger.info('Deleting schedule', { scheduleId: id, userId: currentUser.id });

  // Cron Job 제거
  unregisterSchedule(id);

  // DB에서 삭제 (본인 것만)
  await prisma.schedule.delete({
    where: {
      id,
      userId: currentUser.id,
    },
  });

  logger.info('Schedule deleted', { scheduleId: id });

  return ApiResponseHelper.success({
    success: true,
  }, 'Schedule deleted successfully');
});
