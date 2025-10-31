import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_FAVORITE');

export const dynamic = 'force-dynamic';

/**
 * POST /api/complexes/favorite
 * 관심단지 등록/해제 토글
 */
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  // 사용자 인증 확인
  const currentUser = await requireAuth();

  const body = await request.json();
  const { complexNo } = body;

  logger.info('Favorite toggle requested', { complexNo, userId: currentUser.id });

  if (!complexNo) {
    throw new ApiError(ErrorType.VALIDATION, '단지번호가 필요합니다.', 400);
  }

  // 1. DB에서 단지 찾기
  const complex = await prisma.complex.findUnique({
    where: { complexNo },
    include: {
      favorites: {
        where: {
          userId: currentUser.id, // 본인 즐겨찾기만 확인
        },
      },
      _count: {
        select: { articles: true }
      }
    }
  });

  logger.debug('Complex lookup result', {
    found: !!complex,
    complexNo,
    complexName: complex?.complexName,
    favoritesCount: complex?.favorites.length,
    articlesCount: complex?._count.articles
  });

  if (!complex) {
    throw new ApiError(ErrorType.NOT_FOUND, '단지를 찾을 수 없습니다. 먼저 크롤링을 실행해주세요.', 404);
  }

  // 2. 현재 관심단지 여부 확인
  const isFavorite = complex.favorites.length > 0;
  const action = isFavorite ? '해제' : '등록';

  logger.info('Current favorite status', { isFavorite, action });

  if (isFavorite) {
    // 관심단지 해제
    logger.info('Removing from favorites');

    // DB에서 Favorite 삭제 (본인 것만)
    await prisma.favorite.deleteMany({
      where: {
        complexId: complex.id,
        userId: currentUser.id,
      }
    });

    logger.info('Favorite removed from DB');

    return ApiResponseHelper.success({
      success: true,
      isFavorite: false,
    }, '관심단지에서 제거되었습니다.');
  } else {
    // 관심단지 등록
    logger.info('Adding to favorites');

    // DB에 Favorite 추가
    await prisma.favorite.create({
      data: {
        complexId: complex.id,
        userId: currentUser.id,
      }
    });

    logger.info('Favorite added to DB');

    return ApiResponseHelper.success({
      success: true,
      isFavorite: true,
    }, '관심단지에 등록되었습니다.');
  }
});
