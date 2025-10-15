import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/groups - 모든 그룹 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeComplexes = searchParams.get('includeComplexes') === 'true';

    const groups = await prisma.group.findMany({
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
    const groupsWithStats = groups.map(group => ({
      ...group,
      complexCount: group._count.complexGroups,
      complexes: includeComplexes && group.complexGroups ?
        group.complexGroups.map(cg => ({
          ...cg.complex,
          articleCount: cg.complex._count?.articles || 0
        })) : undefined
    }));

    return NextResponse.json({
      success: true,
      groups: groupsWithStats
    });
  } catch (error) {
    console.error('그룹 조회 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '그룹을 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST /api/groups - 새 그룹 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, type = 'custom', autoRule, complexIds = [] } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '그룹 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    // 같은 이름의 그룹이 있는지 확인
    const existingGroup = await prisma.group.findFirst({
      where: { name }
    });

    if (existingGroup) {
      return NextResponse.json(
        { success: false, error: '이미 같은 이름의 그룹이 존재합니다.' },
        { status: 400 }
      );
    }

    // 그룹의 최대 order 값을 가져옴
    const maxOrder = await prisma.group.findFirst({
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
        order: (maxOrder?.order || 0) + 1
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

    return NextResponse.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('그룹 생성 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '그룹을 생성하는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
