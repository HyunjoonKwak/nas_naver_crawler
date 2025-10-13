/**
 * 알림 개별 수정/삭제 API
 * GET: 알림 상세 조회
 * PUT: 알림 수정
 * PATCH: 알림 활성화/비활성화 토글
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/alerts/[id] - 알림 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: params.id },
      include: {
        logs: {
          take: 50,
          orderBy: {
            sentAt: 'desc',
          },
        },
      },
    });

    if (!alert) {
      return NextResponse.json(
        {
          success: false,
          error: 'Alert not found',
        },
        { status: 404 }
      );
    }

    // 단지 정보 조회
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

    return NextResponse.json({
      success: true,
      alert: {
        ...alert,
        complexes,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch alert',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/alerts/[id] - 알림 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const alert = await prisma.alert.update({
      where: { id: params.id },
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
      },
    });

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update alert',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/alerts/[id] - 알림 활성화/비활성화 토글
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

    const alert = await prisma.alert.update({
      where: { id: params.id },
      data: { isActive },
    });

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    console.error('Failed to toggle alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to toggle alert',
      },
      { status: 500 }
    );
  }
}
