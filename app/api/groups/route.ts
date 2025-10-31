import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_GROUPS');

export const dynamic = 'force-dynamic';

// GET /api/groups - 모든 그룹 조회
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const { searchParams } = new URL(request.url);
  const includeComplexes = searchParams.get('includeComplexes') === 'true';

  const groups = await prisma.group.findMany({
    where: {
      userId: currentUser.id,
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'desc' }
    ],
    include: includeComplexes ? {
      complexGroups: {
        include: {
          complex: {
            include: {
              _count: {
                select: { articles: true }
              }
            }
          }
        }
      },
      _count: {
        select: { complexGroups: true }
      }
    } : {
      _count: {
        select: { complexGroups: true }
      }
    }
  });

  // 단지 수 정보 추가
  const groupsWithStats = groups.map((group: any) => ({
    ...group,
    complexCount: group._count.complexGroups,
    complexes: includeComplexes && group.complexGroups ?
      group.complexGroups.map((cg: any) => ({
        ...cg.complex,
        articleCount: cg.complex._count?.articles || 0
      })) : undefined
  }));

  logger.info('Groups fetched', {
    userId: currentUser.id,
    count: groups.length,
    includeComplexes
  });

  return ApiResponseHelper.success({
    success: true,
    groups: groupsWithStats
  });
});

// POST /api/groups - 새 그룹 생성
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const body = await request.json();
  const { name, description, color, type = 'custom', autoRule, complexIds = [] } = body;

  if (!name) {
    throw new ApiError(ErrorType.VALIDATION, '그룹 이름은 필수입니다.', 400);
  }

  // 같은 이름의 그룹이 있는지 확인 (본인 그룹 중에서)
  const existingGroup = await prisma.group.findFirst({
    where: {
      name,
      userId: currentUser.id,
    }
  });

  if (existingGroup) {
    throw new ApiError(ErrorType.VALIDATION, '이미 같은 이름의 그룹이 존재합니다.', 400);
  }

  // 본인 그룹의 최대 order 값을 가져옴
  const maxOrder = await prisma.group.findFirst({
    where: {
      userId: currentUser.id,
    },
    orderBy: { order: 'desc' },
    select: { order: true }
  });

  // 새 그룹 생성
  const group = await prisma.group.create({
    data: {
      name,
      description,
      color: color || '#3b82f6', // 기본 색상
      type,
      autoRule,
      order: (maxOrder?.order || 0) + 1,
      userId: currentUser.id,
    }
  });

  // 단지들을 그룹에 추가
  if (complexIds.length > 0) {
    await prisma.complexGroup.createMany({
      data: complexIds.map((complexId: string) => ({
        groupId: group.id,
        complexId
      })),
      skipDuplicates: true
    });
  }

  logger.info('Group created', {
    groupId: group.id,
    name,
    type,
    complexCount: complexIds.length,
    userId: currentUser.id
  });

  return ApiResponseHelper.success({
    success: true,
    group
  }, 'Group created successfully');
});
