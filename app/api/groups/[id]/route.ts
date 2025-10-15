import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/groups/[id] - 특정 그룹 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
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
      }
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: '그룹을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 단지 정보 가공
    const groupWithComplexes = {
      ...group,
      complexCount: group._count.complexGroups,
      complexes: group.complexGroups.map(cg => ({
        ...cg.complex,
        articleCount: cg.complex._count?.articles || 0
      }))
    };

    return NextResponse.json({
      success: true,
      group: groupWithComplexes
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

// PUT /api/groups/[id] - 그룹 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, color, order } = body;

    // 그룹 존재 확인
    const existingGroup = await prisma.group.findUnique({
      where: { id: params.id }
    });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: '그룹을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이름이 변경되었고, 같은 이름의 다른 그룹이 있는지 확인
    if (name && name !== existingGroup.name) {
      const duplicateGroup = await prisma.group.findFirst({
        where: {
          name,
          id: { not: params.id }
        }
      });

      if (duplicateGroup) {
        return NextResponse.json(
          { success: false, error: '이미 같은 이름의 그룹이 존재합니다.' },
          { status: 400 }
        );
      }
    }

    // 그룹 업데이트
    const updatedGroup = await prisma.group.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(order !== undefined && { order })
      }
    });

    return NextResponse.json({
      success: true,
      group: updatedGroup
    });
  } catch (error) {
    console.error('그룹 수정 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '그룹을 수정하는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - 그룹 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 그룹 존재 확인
    const existingGroup = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { complexGroups: true }
        }
      }
    });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: '그룹을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 그룹 삭제 (ComplexGroup은 onDelete: Cascade로 자동 삭제됨)
    await prisma.group.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: '그룹이 삭제되었습니다.',
      deletedComplexCount: existingGroup._count.complexGroups
    });
  } catch (error) {
    console.error('그룹 삭제 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '그룹을 삭제하는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
