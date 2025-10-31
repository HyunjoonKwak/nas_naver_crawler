import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, rateLimitPresets } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { validateRequest } from '@/lib/validation';
import { registerSchema } from '@/lib/schemas';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const logger = createLogger('AUTH-REGISTER');

export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  // Rate Limiting (5분당 5회 - 브루트포스 방지)
  const rateLimitResponse = rateLimit(request, rateLimitPresets.auth);
  if (rateLimitResponse) return rateLimitResponse;

  // Zod 스키마 검증
  const validation = await validateRequest(request, registerSchema);
  if (!validation.success) return validation.response;

  const { email, password, name } = validation.data;

  // 이미 존재하는 사용자 확인
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(ErrorType.VALIDATION, '이미 가입된 이메일입니다.', 400);
  }

  // 비밀번호 해시화
  const hashedPassword = await bcrypt.hash(password, 10);

  // 첫 번째 사용자는 자동으로 ADMIN 권한 및 승인
  // 그 외 사용자는 GUEST로 가입 (관리자 승인 필요)
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  // 사용자 생성
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: isFirstUser ? 'ADMIN' : 'GUEST',
      isApproved: isFirstUser,
    },
  });

  logger.info('User registered', {
    userId: user.id,
    email: user.email,
    role: user.role,
    isFirstUser,
  });

  return ApiResponseHelper.success({
    success: true,
    message: isFirstUser
      ? '관리자 계정이 생성되었습니다.'
      : '회원가입이 완료되었습니다. 관리자의 승인을 기다려주세요.',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isApproved: user.isApproved,
    },
  }, isFirstUser ? '관리자 계정이 생성되었습니다.' : '회원가입이 완료되었습니다.');
});
