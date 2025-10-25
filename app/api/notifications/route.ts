/**
 * 알림 API
 * GET: 알림 목록 조회
 * PATCH: 알림 읽음 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications - 알림 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
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
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);

    // 데이터베이스 연결 오류인 경우 재연결 시도
    if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
      try {
        await prisma.$connect();
        console.log('Database reconnected successfully');
      } catch (reconnectError: any) {
        console.error('Failed to reconnect to database:', reconnectError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications - 알림 읽음 처리
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // 모든 알림 읽음 처리
      await prisma.notification.updateMany({
        where: {
          userId: currentUser.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } else if (notificationId) {
      // 특정 알림 읽음 처리
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return NextResponse.json(
          {
            success: false,
            error: 'Notification not found',
          },
          { status: 404 }
        );
      }

      // 본인 알림만 처리 가능
      if (notification.userId !== currentUser.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to mark this notification as read',
          },
          { status: 403 }
        );
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Either notificationId or markAllAsRead must be provided',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Failed to mark notification as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to mark notification as read',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications - 알림 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (deleteAll) {
      // 읽은 알림 모두 삭제
      await prisma.notification.deleteMany({
        where: {
          userId: currentUser.id,
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'All read notifications deleted',
      });
    } else if (notificationId) {
      // 특정 알림 삭제
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return NextResponse.json(
          {
            success: false,
            error: 'Notification not found',
          },
          { status: 404 }
        );
      }

      // 본인 알림만 삭제 가능
      if (notification.userId !== currentUser.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'You do not have permission to delete this notification',
          },
          { status: 403 }
        );
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      return NextResponse.json({
        success: true,
        message: 'Notification deleted',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Either notificationId or deleteAll must be provided',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Failed to delete notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete notification',
      },
      { status: 500 }
    );
  }
}
