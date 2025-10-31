/**
 * 게시글 API
 * GET: 게시글 목록 조회 (페이지네이션, 필터링)
 * POST: 새 게시글 생성
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { createLogger } from '@/lib/logger';
import { rateLimit, rateLimitPresets } from '@/lib/rate-limit';
import { validateRequest } from '@/lib/validation';
import { createPostSchema } from '@/lib/schemas';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const logger = createLogger('POSTS');

/**
 * GET /api/posts - 게시글 목록 조회
 */
export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category'); // FREE, QNA, NOTICE
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'recent'; // recent, popular, likes

  const skip = (page - 1) * limit;

  // 기본 where 조건
  const where: any = {
    isDeleted: false,
  };

  // 카테고리 필터
  if (category) {
    where.category = category;
  }

  // 검색어 필터
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  // 정렬 조건 (고정 게시글이 항상 상단에 오도록 설정)
  let orderBy: any[] = [];
  switch (sortBy) {
    case 'popular':
      orderBy = [{ isPinned: 'desc' }, { views: 'desc' }];
      break;
    case 'likes':
      orderBy = [{ isPinned: 'desc' }, { likesCount: 'desc' }];
      break;
    case 'recent':
    default:
      orderBy = [{ isPinned: 'desc' }, { createdAt: 'desc' }];
      break;
  }

  // 고정 게시글과 일반 게시글을 하나의 쿼리로 조회 (DB 요청 횟수 감소)
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy, // 고정 게시글이 항상 상단에 표시됨
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  logger.debug('Posts fetched successfully', {
    count: posts.length,
    total,
    page,
    category,
    sortBy
  });

  return ApiResponseHelper.success({
    success: true,
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/posts - 새 게시글 생성
 */
export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  // Rate Limiting: 분당 5회
  const rateLimitResponse = rateLimit(request, rateLimitPresets.post);
  if (rateLimitResponse) return rateLimitResponse;

  const currentUser = await requireAuth();

  // Zod 스키마 검증
  const validation = await validateRequest(request, createPostSchema);
  if (!validation.success) return validation.response;

  const { title, content, category, images } = validation.data;

  // 공지사항은 관리자만 작성 가능
  if (category === 'NOTICE' && currentUser.role !== 'ADMIN') {
    throw new ApiError(ErrorType.AUTHORIZATION, 'Only admins can create notices', 403);
  }

  // 게시글 생성 및 이미지 저장 (트랜잭션)
  const post = await prisma.$transaction(async (tx) => {
    // 게시글 생성
    const newPost = await tx.post.create({
      data: {
        title,
        content,
        category,
        authorId: currentUser.id,
        isPinned: category === 'NOTICE', // 공지사항은 자동으로 고정
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 이미지가 있으면 저장
    if (images && Array.isArray(images) && images.length > 0) {
      await tx.postImage.createMany({
        data: images.map((img: any, index: number) => ({
          postId: newPost.id,
          url: img.url,
          filename: img.filename,
          size: img.size,
          order: index,
        })),
      });
    }

    return newPost;
  });

  logger.info('Post created successfully', {
    postId: post.id,
    category: post.category,
    authorId: currentUser.id
  });

  return ApiResponseHelper.success({
    success: true,
    post,
  }, 'Post created successfully');
});
