import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { invalidateCache } from '@/lib/cache';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_COMPLEX');

export const dynamic = 'force-dynamic';

// POST: 단지 추가 (관심단지 X, Complex 테이블에만 추가)
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const body = await request.json();
  const { complexNo, complexName } = body;

  if (!complexNo) {
    throw new ApiError(ErrorType.VALIDATION, '단지번호가 필요합니다.', 400);
  }

  // 단지가 DB에 이미 있는지 확인
  let complex = await prisma.complex.findUnique({
    where: { complexNo }
  });

  // 이미 존재하는 경우
  if (complex) {
    throw new ApiError(ErrorType.VALIDATION, '이미 등록된 단지입니다.', 400);
  }

  // Complex 테이블에만 추가 (Favorite에는 추가하지 않음)
  complex = await prisma.complex.create({
    data: {
      complexNo,
      complexName: complexName || `단지 ${complexNo}`,
      address: '',
      userId: currentUser.id,
    }
  });

  logger.info('Complex added', {
    complexNo,
    complexName,
    userId: currentUser.id
  });

  // 캐시 무효화
  invalidateCache(`complexes:${currentUser.id}`);
  invalidateCache(`favorites:${currentUser.id}`);

  return ApiResponseHelper.success({
    success: true,
    complex: {
      complexNo: complex.complexNo,
      complexName: complex.complexName,
      id: complex.id
    }
  }, '단지가 추가되었습니다.');
});

// GET: 모든 단지 조회 (사용자가 생성한 모든 단지)
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  // 그룹 필터링을 위한 where 조건
  const whereCondition: any = {
    userId: currentUser.id
  };

  // 그룹 필터링이 있는 경우
  if (groupId) {
    whereCondition.complexGroups = {
      some: {
        groupId: groupId
      }
    };
  }

  // ✅ 개선: 필요한 데이터만 조회
  const complexes = await prisma.complex.findMany({
    where: whereCondition,
    select: {
      id: true,
      complexNo: true,
      complexName: true,
      address: true,
      createdAt: true,
      updatedAt: true,
      totalHousehold: true,
      totalDong: true,
      _count: {
        select: { articles: true }
      },
      articles: {
        select: {
          id: true,
          tradeTypeName: true,
        }
      },
      favorites: {
        where: {
          userId: currentUser.id
        }
      },
      complexGroups: {
        where: {
          group: {
            userId: currentUser.id
          }
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // 응답 형태로 변환
  const formattedComplexes = complexes.map((complex) => {
    const articles = complex.articles || [];
    const isFavorite = complex.favorites.length > 0;

    // 거래 유형별 매물 수 계산
    const tradeTypeCount = articles.reduce((acc, article) => {
      const type = article.tradeTypeName || '기타';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      id: complex.id, // 그룹 관리에 필요
      complexNo: complex.complexNo,
      complexName: complex.complexName,
      isFavorite, // 관심단지 여부
      createdAt: complex.createdAt?.toISOString(),
      updatedAt: complex.updatedAt.toISOString(),
      lastCrawledAt: complex.updatedAt.toISOString(),
      articleCount: articles.length,
      totalHouseHoldCount: complex.totalHousehold,
      totalDongCount: complex.totalDong,
      groups: complex.complexGroups?.map((cg: any) => ({
        id: cg.group.id,
        name: cg.group.name,
        color: cg.group.color
      })) || [],
      stats: {
        total: articles.length,
        A1: tradeTypeCount['매매'] || 0,
        B1: tradeTypeCount['전세'] || 0,
        B2: tradeTypeCount['월세'] || 0,
      }
    };
  });

  logger.info('Complexes fetched', {
    userId: currentUser.id,
    count: formattedComplexes.length,
    groupId
  });

  return ApiResponseHelper.success({
    complexes: formattedComplexes,
    total: formattedComplexes.length
  });
});

// PATCH: 단지 번호 수정
export const PATCH = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const body = await request.json();
  const { oldComplexNo, newComplexNo } = body;

  if (!oldComplexNo || !newComplexNo) {
    throw new ApiError(ErrorType.VALIDATION, '기존 단지번호와 새 단지번호가 필요합니다.', 400);
  }

  // 기존 단지 찾기
  const complex = await prisma.complex.findUnique({
    where: { complexNo: oldComplexNo }
  });

  if (!complex) {
    throw new ApiError(ErrorType.NOT_FOUND, '해당 단지를 찾을 수 없습니다.', 404);
  }

  // 권한 확인: 본인이 생성한 단지만 수정 가능
  if (complex.userId !== currentUser.id) {
    throw new ApiError(ErrorType.AUTHORIZATION, '본인이 생성한 단지만 수정할 수 있습니다.', 403);
  }

  // 새 단지 번호가 이미 존재하는지 확인
  const existingComplex = await prisma.complex.findUnique({
    where: { complexNo: newComplexNo }
  });

  if (existingComplex) {
    throw new ApiError(ErrorType.VALIDATION, '새 단지번호가 이미 사용 중입니다.', 400);
  }

  logger.info('Complex number update started', {
    oldComplexNo,
    newComplexNo,
    complexName: complex.complexName,
    userId: currentUser.id
  });

  // 단지 번호 업데이트
  const updatedComplex = await prisma.complex.update({
    where: { id: complex.id },
    data: { complexNo: newComplexNo }
  });

  logger.info('Complex number updated', {
    oldComplexNo,
    newComplexNo,
    complexName: updatedComplex.complexName
  });

  // 캐시 무효화
  invalidateCache(`complexes:${currentUser.id}`);
  invalidateCache(`favorites:${currentUser.id}`);

  return ApiResponseHelper.success({
    success: true,
    complex: {
      complexNo: updatedComplex.complexNo,
      complexName: updatedComplex.complexName,
      id: updatedComplex.id
    }
  }, '단지 번호가 수정되었습니다.');
});

// DELETE: 단지 완전 삭제 (Complex 테이블에서 삭제, Cascade로 연관 데이터 모두 삭제)
export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const { searchParams } = new URL(request.url);
  const complexNo = searchParams.get('complexNo');

  if (!complexNo) {
    throw new ApiError(ErrorType.VALIDATION, '단지번호가 필요합니다.', 400);
  }

  // 단지 찾기
  const complex = await prisma.complex.findUnique({
    where: { complexNo },
    include: {
      _count: {
        select: {
          articles: true,
          favorites: true,
          complexGroups: true
        }
      }
    }
  });

  if (!complex) {
    throw new ApiError(ErrorType.NOT_FOUND, '해당 단지를 찾을 수 없습니다.', 404);
  }

  // 권한 확인: 본인이 생성한 단지만 삭제 가능
  if (complex.userId !== currentUser.id) {
    throw new ApiError(ErrorType.AUTHORIZATION, '본인이 생성한 단지만 삭제할 수 있습니다.', 403);
  }

  logger.info('Complex deletion started', {
    complexNo,
    complexName: complex.complexName,
    userId: currentUser.id,
    relatedData: {
      articles: complex._count.articles,
      favorites: complex._count.favorites,
      complexGroups: complex._count.complexGroups
    }
  });

  // Complex 삭제 (Cascade로 연관 데이터 모두 삭제)
  // - articles (매물)
  // - favorites (관심단지)
  // - complexGroups (그룹 연결)
  await prisma.complex.delete({
    where: { id: complex.id }
  });

  logger.info('Complex deleted', {
    complexNo,
    complexName: complex.complexName
  });

  // 캐시 무효화
  invalidateCache(`complexes:${currentUser.id}`);
  invalidateCache(`favorites:${currentUser.id}`);

  return ApiResponseHelper.success({
    success: true,
    complexNo,
    deletedData: {
      articles: complex._count.articles,
      favorites: complex._count.favorites,
      complexGroups: complex._count.complexGroups
    }
  }, '단지가 완전히 삭제되었습니다.');
});
