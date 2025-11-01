/**
 * 사용자 환경 변수 실제 값 조회 API
 *
 * GET: 마스킹되지 않은 실제 값 반환
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_USER_ENV_CONFIG_REVEAL');

/**
 * GET /api/user-env-config/[id]/reveal
 * 환경 변수의 실제 값 조회 (마스킹 해제)
 */
export const GET = ApiResponseHelper.handler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(ErrorType.AUTHENTICATION, '인증이 필요합니다', 401);
  }

  const { id } = params;

  const config = await prisma.userEnvConfig.findUnique({
    where: { id },
  });

  if (!config) {
    throw new ApiError(ErrorType.NOT_FOUND, '환경 변수를 찾을 수 없습니다', 404);
  }

  // 소유권 확인
  if (config.userId !== session.user.id) {
    throw new ApiError(ErrorType.AUTHORIZATION, '권한이 없습니다', 403);
  }

  const decryptedValue = decrypt(config.value);

  logger.info('User env config value revealed', { userId: session.user.id, configId: id, key: config.key });

  return ApiResponseHelper.success({
    success: true,
    data: {
      id: config.id,
      key: config.key,
      value: decryptedValue,
      displayName: config.displayName,
    },
  });
});
