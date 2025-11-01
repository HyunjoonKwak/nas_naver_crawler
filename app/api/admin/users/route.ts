import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_ADMIN_USERS');

export const dynamic = 'force-dynamic';

export const GET = ApiResponseHelper.handler(async () => {
  const session = await getServerSession(authOptions) as Session | null;
  if (!session?.user) {
    throw new ApiError(ErrorType.AUTHENTICATION, 'Unauthorized', 401);
  }

  // 관리자 권한 확인
  const user = session.user as any;
  if (user.role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, 'Admin permission required', 403);
  }

  // 모든 사용자 조회
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  logger.info('Admin fetched all users', { adminId: user.id, count: users.length });

  return ApiResponseHelper.success({ users });
});
