/**
 * 단지별 상세 API
 * PATCH /api/complex/[complexNo] - 단지 정보 업데이트 (realPriceAptName 등)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger('COMPLEX_DETAIL');

const updateComplexSchema = z.object({
  realPriceAptName: z.string().optional().nullable(),
});

export const PATCH = ApiResponseHelper.handler(async (
  request: NextRequest,
  { params }: { params: { complexNo: string } }
) => {
  const currentUser = await requireAuth();
  const { complexNo } = params;

  // 단지 조회 및 권한 확인
  const complex = await prisma.complex.findUnique({
    where: { complexNo },
  });

  if (!complex) {
    throw new ApiError(ErrorType.NOT_FOUND, '단지를 찾을 수 없습니다.', 404);
  }

  // 권한 확인: 본인이 생성한 단지만 수정 가능
  if (complex.userId !== currentUser.id) {
    throw new ApiError(ErrorType.AUTHORIZATION, '본인이 생성한 단지만 수정할 수 있습니다.', 403);
  }

  // 요청 본문 검증
  const body = await request.json();
  const validationResult = updateComplexSchema.safeParse(body);

  if (!validationResult.success) {
    throw new ApiError(
      ErrorType.VALIDATION,
      '잘못된 요청 형식입니다.',
      400,
      validationResult.error.errors
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

  logger.info('Complex info updated', {
    complexNo,
    complexName: complex.complexName,
    realPriceAptName: updatedComplex.realPriceAptName,
    userId: currentUser.id,
  });

  return ApiResponseHelper.success({
    success: true,
    message: '단지 정보가 업데이트되었습니다.',
    complex: updatedComplex,
  }, '단지 정보가 업데이트되었습니다.');
});
