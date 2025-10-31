import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('USEFUL_LINKS');

export const dynamic = 'force-dynamic';

// GET: 모든 유용한 링크 조회
export const GET = ApiResponseHelper.handler(async () => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const links = await prisma.usefulLink.findMany({
    where: {
      isActive: true,
      userId: currentUser.id,
    },
    orderBy: [
      { category: 'asc' },
      { order: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // 카테고리별로 그룹화
  const groupedLinks = links.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, typeof links>);

  logger.info('Useful links fetched', { userId: currentUser.id, count: links.length });

  return ApiResponseHelper.success({
    success: true,
    links,
    groupedLinks,
  });
});

// POST: 새 링크 추가
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const body = await request.json();
  const { title, url, description, category, icon, order } = body;

  if (!title || !url || !category) {
    throw new ApiError(ErrorType.VALIDATION, 'Title, URL, and category are required', 400);
  }

  const link = await prisma.usefulLink.create({
    data: {
      title,
      url,
      description,
      category,
      icon: icon || '🔗',
      order: order ?? 0,
      userId: currentUser.id,
    },
  });

  logger.info('Useful link created', { userId: currentUser.id, linkId: link.id, category });

  return ApiResponseHelper.success({
    success: true,
    link,
  }, 'Link created successfully');
});

// PUT: 링크 수정
export const PUT = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const body = await request.json();
  const { id, title, url, description, category, icon, order, isActive } = body;

  if (!id) {
    throw new ApiError(ErrorType.VALIDATION, 'Link ID is required', 400);
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (url !== undefined) updateData.url = url;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (icon !== undefined) updateData.icon = icon;
  if (order !== undefined) updateData.order = order;
  if (isActive !== undefined) updateData.isActive = isActive;

  const link = await prisma.usefulLink.update({
    where: {
      id,
      userId: currentUser.id,
    },
    data: updateData,
  });

  logger.info('Useful link updated', { userId: currentUser.id, linkId: id });

  return ApiResponseHelper.success({
    success: true,
    link,
  }, 'Link updated successfully');
});

// DELETE: 링크 삭제
export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(ErrorType.VALIDATION, 'Link ID is required', 400);
  }

  await prisma.usefulLink.delete({
    where: {
      id,
      userId: currentUser.id,
    },
  });

  logger.info('Useful link deleted', { userId: currentUser.id, linkId: id });

  return ApiResponseHelper.success({
    success: true,
  }, 'Link deleted successfully');
});
