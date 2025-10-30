/**
 * 단지별 상세 API
 * PATCH /api/complex/[complexNo] - 단지 정보 업데이트 (realPriceAptName 등)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';

const updateComplexSchema = z.object({
  realPriceAptName: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { complexNo: string } }
) {
  try {
    const currentUser = await requireAuth();
    const { complexNo } = params;

    // 단지 조회 및 권한 확인
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
    });

    if (!complex) {
      return NextResponse.json(
        { error: '단지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인: 본인이 생성한 단지만 수정 가능
    if (complex.userId !== currentUser.id) {
      return NextResponse.json(
        { error: '본인이 생성한 단지만 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 요청 본문 검증
    const body = await request.json();
    const validationResult = updateComplexSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { realPriceAptName } = validationResult.data;

    // 단지 정보 업데이트
    const updatedComplex = await prisma.complex.update({
      where: { complexNo },
      data: {
        realPriceAptName: realPriceAptName === '' ? null : realPriceAptName,
      },
      select: {
        complexNo: true,
        complexName: true,
        realPriceAptName: true,
      },
    });

    console.log('[API_COMPLEX_UPDATE] 단지 정보 업데이트:', {
      complexNo,
      complexName: complex.complexName,
      realPriceAptName: updatedComplex.realPriceAptName,
      userId: currentUser.id,
    });

    return NextResponse.json({
      success: true,
      message: '단지 정보가 업데이트되었습니다.',
      complex: updatedComplex,
    });
  } catch (error: any) {
    console.error('[API_COMPLEX_UPDATE] PATCH error:', error);
    return NextResponse.json(
      { error: '단지 정보 업데이트 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
