/**
 * 게시글 API
 * GET: 게시글 목록 조회 (페이지네이션, 필터링)
 * POST: 새 게시글 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/posts - 게시글 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
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

    // 정렬 조건
    let orderBy: any = {};
    switch (sortBy) {
      case 'popular':
        orderBy = { views: 'desc' };
        break;
      case 'likes':
        orderBy = { likesCount: 'desc' };
        break;
      case 'recent':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // 공지사항은 항상 상단 고정
    const pinnedPosts = category === 'NOTICE' || !category
      ? await prisma.post.findMany({
          where: {
            ...where,
            isPinned: true,
          },
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
          orderBy: {
            createdAt: 'desc',
          },
        })
      : [];

    // 일반 게시글 조회
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          ...where,
          isPinned: false,
        },
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.post.count({
        where: {
          ...where,
          isPinned: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      posts: [...pinnedPosts, ...posts],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch posts',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts - 새 게시글 생성
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const body = await request.json();
    const { title, content, category, images } = body;

    // 필수 필드 검증
    if (!title || !content || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, content, and category are required',
        },
        { status: 400 }
      );
    }

    // 카테고리 검증
    if (!['FREE', 'QNA', 'NOTICE'].includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category',
        },
        { status: 400 }
      );
    }

    // 공지사항은 관리자만 작성 가능
    if (category === 'NOTICE' && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only admins can create notices',
        },
        { status: 403 }
      );
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

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error: any) {
    console.error('Failed to create post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create post',
      },
      { status: 500 }
    );
  }
}
