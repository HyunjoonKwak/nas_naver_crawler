import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_ADMIN_USER_DELETE');

export const dynamic = 'force-dynamic';

export const DELETE = ApiResponseHelper.handler(async (
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

  // 자기 자신은 삭제할 수 없음
  if (userId === user.id) {
    throw new ApiError(ErrorType.VALIDATION, 'Cannot delete yourself', 400);
  }

  // 사용자 삭제 (CASCADE로 관련 데이터도 자동 삭제)
  await prisma.user.delete({
    where: { id: userId },
  });

  logger.info('User deleted by admin', { deletedUserId: userId, adminId: user.id });

  return ApiResponseHelper.success({ success: true }, 'User deleted successfully');
});
