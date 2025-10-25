import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// GET: 모든 유용한 링크 조회
export async function GET() {
  try {
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

    return NextResponse.json({
      success: true,
      links,
      groupedLinks,
    });
  } catch (error: any) {
    console.error('Failed to fetch useful links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch useful links' },
      { status: 500 }
    );
  }
}

// POST: 새 링크 추가
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const body = await request.json();
    const { title, url, description, category, icon, order } = body;

    if (!title || !url || !category) {
      return NextResponse.json(
        { error: 'Title, URL, and category are required' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (error: any) {
    console.error('Failed to create useful link:', error);
    return NextResponse.json(
      { error: 'Failed to create useful link' },
      { status: 500 }
    );
  }
}

// PUT: 링크 수정
export async function PUT(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const body = await request.json();
    const { id, title, url, description, category, icon, order, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (error: any) {
    console.error('Failed to update useful link:', error);
    return NextResponse.json(
      { error: 'Failed to update useful link' },
      { status: 500 }
    );
  }
}

// DELETE: 링크 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    await prisma.usefulLink.delete({
      where: {
        id,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Link deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete useful link:', error);
    return NextResponse.json(
      { error: 'Failed to delete useful link' },
      { status: 500 }
    );
  }
}
