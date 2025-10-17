/**
 * 알림 설정 API
 * GET: 알림 목록 조회
 * POST: 새 알림 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/alerts - 알림 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      alerts: alertsWithComplexInfo,
    });
  } catch (error: any) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch alerts',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts - 새 알림 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const body = await request.json();

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
    } = body;

    // 필수 필드 검증
    if (!name || !complexIds || complexIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and at least one complex are required',
        },
        { status: 400 }
      );
    }

    // 웹훅 알림이 활성화된 경우 URL 필수
    if (notifyWebhook && !webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook URL is required when webhook notification is enabled',
        },
        { status: 400 }
      );
    }

    // 알림 생성
    const alert = await prisma.alert.create({
      data: {
        name,
        complexIds,
        tradeTypes: tradeTypes || [],
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        minArea: minArea || null,
        maxArea: maxArea || null,
        notifyEmail: notifyEmail || false,
        notifyBrowser: notifyBrowser || true,
        notifyWebhook: notifyWebhook || false,
        webhookUrl: webhookUrl || null,
        isActive: true,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    console.error('Failed to create alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create alert',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts - 알림 삭제
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
          error: 'Alert ID is required',
        },
        { status: 400 }
      );
    }

    // 본인 알림만 삭제 가능
    await prisma.alert.delete({
      where: {
        id,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete alert',
      },
      { status: 500 }
    );
  }
}
