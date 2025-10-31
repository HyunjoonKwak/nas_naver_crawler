import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export const GET = ApiResponseHelper.handler(async () => {
  // 인증 확인
  const currentUser = await requireAuth();

  // 사용자가 접근 가능한 userId 목록 가져오기
  const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

  // 크롤링 히스토리를 최신순으로 조회 (사용자 필터링)
  const history = await prisma.crawlHistory.findMany({
    where: {
      userId: { in: accessibleUserIds }
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // 최근 100개만 조회
  });

  return ApiResponseHelper.success({
    history,
    total: history.length,
  });
});
