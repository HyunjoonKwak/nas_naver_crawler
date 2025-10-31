/**
 * 알림 개별 수정/삭제 API
 * GET: 알림 상세 조회
 * PUT: 알림 수정
 * PATCH: 알림 활성화/비활성화 토글
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/auth-utils';
import { validateRequest } from '@/lib/validation';
import { updateAlertSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';


/**
 * GET /api/alerts/[id] - 알림 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const alert = await prisma.alert.findFirst({
      where: {
        id: params.id,
        userId: currentUser.id,
      },
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
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    // Zod 스키마로 입력 검증
    const validation = await validateRequest(request, updateAlertSchema);
    if (!validation.success) {
      return validation.response;
    }

    const updateData = validation.data;

    const alert = await prisma.alert.update({
      where: {
        id: params.id,
        userId: currentUser.id,
      },
      data: updateData,
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
 * PATCH /api/alerts/[id] - 알림 부분 수정 (isActive 토글 또는 complexIds 업데이트)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    // Zod 스키마로 입력 검증 (PATCH는 updateAlertSchema 사용)
    const validation = await validateRequest(request, updateAlertSchema);
    if (!validation.success) {
      return validation.response;
    }

    const updateData = validation.data;

    // 업데이트할 필드가 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid fields to update',
        },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.update({
      where: {
        id: params.id,
        userId: currentUser.id,
      },
      data: updateData,
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
