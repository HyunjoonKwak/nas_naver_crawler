/**
 * 알림 API
 * GET: 알림 목록 조회
 * PATCH: 알림 읽음 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_NOTIFICATIONS');

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications - 알림 목록 조회
 */
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const where: any = {
      userId: currentUser.id,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    // 필요한 필드만 select하여 성능 개선
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          createdAt: true,
          // userId는 제외 (where 조건으로 이미 필터링됨)
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: currentUser.id,
          isRead: false,
        },
      }),
  ]);

  logger.info('Notifications fetched', {
    userId: currentUser.id,
    count: notifications.length,
    unreadCount,
    page
  });

  return ApiResponseHelper.success({
    success: true,
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * PATCH /api/notifications - 알림 읽음 처리
 */
export const PATCH = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const body = await request.json();
  const { notificationId, markAllAsRead } = body;

  if (markAllAsRead) {
    // 모든 알림 읽음 처리
    const result = await prisma.notification.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    logger.info('All notifications marked as read', { userId: currentUser.id, count: result.count });

    return ApiResponseHelper.success({
      success: true,
    }, 'All notifications marked as read');
  } else if (notificationId) {
    // 특정 알림 읽음 처리
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new ApiError(ErrorType.NOT_FOUND, 'Notification not found', 404);
    }

    // 본인 알림만 처리 가능
    if (notification.userId !== currentUser.id) {
      throw new ApiError(ErrorType.AUTHORIZATION, 'You do not have permission to mark this notification as read', 403);
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
      },
    });

    logger.info('Notification marked as read', { userId: currentUser.id, notificationId });

    return ApiResponseHelper.success({
      success: true,
    }, 'Notification marked as read');
  } else {
    throw new ApiError(ErrorType.VALIDATION, 'Either notificationId or markAllAsRead must be provided', 400);
  }
});

/**
 * DELETE /api/notifications - 알림 삭제
 */
export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const { searchParams } = new URL(request.url);
  const notificationId = searchParams.get('id');
  const deleteAll = searchParams.get('deleteAll') === 'true';

  if (deleteAll) {
    // 읽은 알림 모두 삭제
    const result = await prisma.notification.deleteMany({
      where: {
        userId: currentUser.id,
        isRead: true,
      },
    });

    logger.info('All read notifications deleted', { userId: currentUser.id, count: result.count });

    return ApiResponseHelper.success({
      success: true,
    }, 'All read notifications deleted');
  } else if (notificationId) {
    // 특정 알림 삭제
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new ApiError(ErrorType.NOT_FOUND, 'Notification not found', 404);
    }

    // 본인 알림만 삭제 가능
    if (notification.userId !== currentUser.id) {
      throw new ApiError(ErrorType.AUTHORIZATION, 'You do not have permission to delete this notification', 403);
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    logger.info('Notification deleted', { userId: currentUser.id, notificationId });

    return ApiResponseHelper.success({
      success: true,
    }, 'Notification deleted');
  } else {
    throw new ApiError(ErrorType.VALIDATION, 'Either notificationId or deleteAll must be provided', 400);
  }
});
