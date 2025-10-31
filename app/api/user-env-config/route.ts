/**
 * 사용자 환경 변수 CRUD API
 *
 * GET: 사용자의 환경 변수 목록 조회
 * POST: 새 환경 변수 생성
 * PUT: 환경 변수 업데이트
 * DELETE: 환경 변수 삭제
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskValue } from '@/lib/encryption';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_USER_ENV_CONFIG');

export const dynamic = 'force-dynamic';

/**
 * GET /api/user-env-config
 * 사용자의 환경 변수 목록 조회
 */
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(ErrorType.AUTHENTICATION, '인증이 필요합니다', 401);
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const configs = await prisma.userEnvConfig.findMany({
    where: {
      userId: session.user.id,
      ...(category && { category }),
    },
    orderBy: [
      { category: 'asc' },
      { displayName: 'asc' },
    ],
  });

  // 민감한 정보는 마스킹
  const maskedConfigs = configs.map(config => ({
    ...config,
    value: config.isSecret ? maskValue(decrypt(config.value)) : decrypt(config.value),
  }));

  logger.info('User env configs fetched', { userId: session.user.id, count: configs.length, category });

  return ApiResponseHelper.success({
    success: true,
    data: maskedConfigs,
  });
});

/**
 * POST /api/user-env-config
 * 새 환경 변수 생성
 */
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(ErrorType.AUTHENTICATION, '인증이 필요합니다', 401);
  }

  const body = await request.json();
  const {
    key,
    value,
    displayName,
    description,
    category,
    isSecret,
    inputGuide,
    placeholder,
    validation,
    helpUrl,
  } = body;

  // 필수 필드 검증
  if (!key || !value || !displayName) {
    throw new ApiError(ErrorType.VALIDATION, '필수 항목을 모두 입력해주세요', 400);
  }

  // 이미 존재하는지 확인
  const existing = await prisma.userEnvConfig.findUnique({
    where: {
      userId_key: {
        userId: session.user.id,
        key,
      },
    },
  });

  if (existing) {
    throw new ApiError(ErrorType.VALIDATION, '이미 존재하는 환경 변수입니다', 409);
  }

  // 암호화하여 저장
  const encryptedValue = encrypt(value);

  const config = await prisma.userEnvConfig.create({
    data: {
      userId: session.user.id,
      key,
      value: encryptedValue,
      displayName,
      description,
      category: category || 'other',
      isSecret: isSecret ?? true,
      inputGuide,
      placeholder,
      validation,
      helpUrl,
    },
  });

  logger.info('User env config created', { userId: session.user.id, key, category: config.category });

  return ApiResponseHelper.success({
    success: true,
    data: {
      ...config,
      value: isSecret ? maskValue(value) : value,
    },
  }, '환경 변수가 생성되었습니다');
});

/**
 * PUT /api/user-env-config
 * 환경 변수 업데이트
 */
export const PUT = ApiResponseHelper.handler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(ErrorType.AUTHENTICATION, '인증이 필요합니다', 401);
  }

  const body = await request.json();
  const { id, value, displayName, description, isSecret } = body;

  if (!id) {
    throw new ApiError(ErrorType.VALIDATION, 'ID가 필요합니다', 400);
  }

  // 소유권 확인
  const existing = await prisma.userEnvConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(ErrorType.NOT_FOUND, '환경 변수를 찾을 수 없습니다', 404);
  }

  if (existing.userId !== session.user.id) {
    throw new ApiError(ErrorType.AUTHORIZATION, '권한이 없습니다', 403);
  }

  // 업데이트할 데이터 준비
  const updateData: any = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (description !== undefined) updateData.description = description;
  if (isSecret !== undefined) updateData.isSecret = isSecret;
  if (value !== undefined) {
    updateData.value = encrypt(value);
  }

  const updated = await prisma.userEnvConfig.update({
    where: { id },
    data: updateData,
  });

  logger.info('User env config updated', { userId: session.user.id, configId: id, key: updated.key });

  return ApiResponseHelper.success({
    success: true,
    data: {
      ...updated,
      value: updated.isSecret ? maskValue(decrypt(updated.value)) : decrypt(updated.value),
    },
  }, '환경 변수가 업데이트되었습니다');
});

/**
 * DELETE /api/user-env-config
 * 환경 변수 삭제
 */
export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(ErrorType.AUTHENTICATION, '인증이 필요합니다', 401);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(ErrorType.VALIDATION, 'ID가 필요합니다', 400);
  }

  // 소유권 확인
  const existing = await prisma.userEnvConfig.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(ErrorType.NOT_FOUND, '환경 변수를 찾을 수 없습니다', 404);
  }

  if (existing.userId !== session.user.id) {
    throw new ApiError(ErrorType.AUTHORIZATION, '권한이 없습니다', 403);
  }

  await prisma.userEnvConfig.delete({
    where: { id },
  });

  logger.info('User env config deleted', { userId: session.user.id, configId: id, key: existing.key });

  return ApiResponseHelper.success({
    success: true,
  }, '환경 변수가 삭제되었습니다');
});
