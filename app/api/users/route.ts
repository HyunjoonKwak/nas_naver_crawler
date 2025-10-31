import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_USERS');

export const dynamic = 'force-dynamic';

// GET: 사용자 목록 조회 (관리자 전용)
export const GET = ApiResponseHelper.handler(async () => {
  const session = await getServerSession(authOptions) as Session | null;

  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, '권한이 없습니다.', 403);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isApproved: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  logger.info('Users list fetched', { count: users.length, adminId: (session.user as any).id });

  return ApiResponseHelper.success({
    success: true,
    users,
  });
});

// PUT: 사용자 정보 수정 (관리자 전용)
export const PUT = ApiResponseHelper.handler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions) as Session | null;

  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, '권한이 없습니다.', 403);
  }

  const { userId, isApproved, isActive, role } = await request.json();

  if (!userId) {
    throw new ApiError(ErrorType.VALIDATION, '사용자 ID가 필요합니다.', 400);
  }

  const updateData: any = {};
  if (isApproved !== undefined) updateData.isApproved = isApproved;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (role !== undefined) updateData.role = role;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isApproved: true,
      isActive: true,
    },
  });

  logger.info('User updated', {
    userId,
    updates: Object.keys(updateData),
    adminId: (session.user as any).id
  });

  return ApiResponseHelper.success({
    success: true,
    user,
  }, '사용자 정보가 수정되었습니다.');
});

// DELETE: 사용자 삭제 (관리자 전용)
export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions) as Session | null;

  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, '권한이 없습니다.', 403);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    throw new ApiError(ErrorType.VALIDATION, '사용자 ID가 필요합니다.', 400);
  }

  // 자기 자신은 삭제할 수 없음
  if ((session.user as any).id === userId) {
    throw new ApiError(ErrorType.VALIDATION, '자기 자신은 삭제할 수 없습니다.', 400);
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  logger.info('User deleted', { userId, adminId: (session.user as any).id });

  return ApiResponseHelper.success({
    success: true,
  }, '사용자가 삭제되었습니다.');
});
