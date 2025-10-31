/**
 * 알림 설정 API
 * GET: 알림 목록 조회
 * POST: 새 알림 생성
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { validateRequest } from '@/lib/validation';
import { createAlertSchema } from '@/lib/schemas';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_ALERTS');

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts - 알림 목록 조회
 */
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const alerts = await prisma.alert.findMany({
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
          sentAt: 'desc',
        },
      },
    },
  });

  logger.info('Alerts fetched', { userId: currentUser.id, count: alerts.length });

  // 각 알림의 단지 정보 조회
  const alertsWithComplexInfo = await Promise.all(
    alerts.map(async (alert) => {
      const complexes = await prisma.complex.findMany({
        where: {
          complexNo: {
            in: alert.complexIds,
          },
        },
        select: {
          complexNo: true,
          complexName: true,
        },
      });

      return {
        ...alert,
        complexes,
      };
    })
  );

  return ApiResponseHelper.success({
    success: true,
    alerts: alertsWithComplexInfo,
  });
});

/**
 * POST /api/alerts - 새 알림 생성
 */
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  // Zod 스키마로 입력 검증
  const validation = await validateRequest(request, createAlertSchema);
  if (!validation.success) {
    return validation.response;
  }

  const {
    name,
    complexIds,
    tradeTypes,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    notifyEmail,
    notifyBrowser,
    notifyWebhook,
    webhookUrl,
  } = validation.data;

  // 알림 생성
  const alert = await prisma.alert.create({
    data: {
      name,
      complexIds,
      tradeTypes,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      notifyEmail,
      notifyBrowser,
      notifyWebhook,
      webhookUrl,
      isActive: true,
      userId: currentUser.id,
    },
  });

  logger.info('Alert created', { alertId: alert.id, name, userId: currentUser.id });

  return ApiResponseHelper.success({
    success: true,
    alert,
  }, 'Alert created successfully');
});

/**
 * DELETE /api/alerts - 알림 삭제
 */
export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(ErrorType.VALIDATION, 'Alert ID is required', 400);
  }

  logger.info('Deleting alert', { alertId: id, userId: currentUser.id });

  // 본인 알림만 삭제 가능
  await prisma.alert.delete({
    where: {
      id,
      userId: currentUser.id,
    },
  });

  logger.info('Alert deleted', { alertId: id });

  return ApiResponseHelper.success({
    success: true,
  }, 'Alert deleted successfully');
});
