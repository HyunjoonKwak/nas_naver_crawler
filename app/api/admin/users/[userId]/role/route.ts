import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_ADMIN_USER_ROLE');

export const dynamic = 'force-dynamic';

export const PATCH = ApiResponseHelper.handler(async (
  request: NextRequest,
  { params }: { params: { userId: string } }
) => {
  const session = await getServerSession(authOptions) as Session | null;
  if (!session?.user) {
    throw new ApiError(ErrorType.AUTHENTICATION, 'Unauthorized', 401);
  }

  // 관리자 권한 확인
  const user = session.user as any;
  if (user.role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, 'Admin permission required', 403);
  }

  const { userId } = params;
  const { role } = await request.json();

  // 유효한 역할인지 확인
  if (!['ADMIN', 'USER', 'FAMILY'].includes(role)) {
    throw new ApiError(ErrorType.VALIDATION, 'Invalid role', 400);
  }

  // 자기 자신의 역할은 변경할 수 없음
  if (userId === user.id) {
    throw new ApiError(ErrorType.VALIDATION, 'Cannot change your own role', 400);
  }

  // 역할 업데이트
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  logger.info('User role updated by admin', {
    userId,
    newRole: role,
    adminId: user.id
  });

  return ApiResponseHelper.success({ user: updatedUser }, 'User role updated successfully');
});
