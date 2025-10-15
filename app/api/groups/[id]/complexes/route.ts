import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// POST /api/groups/[id]/complexes - 그룹에 단지 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { complexIds } = body;

    if (!Array.isArray(complexIds) || complexIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '단지 ID 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 그룹 존재 확인
    const group = await prisma.group.findUnique({
      where: { id: params.id }
    });

    if (!group) {
      return NextResponse.json(
        { success: false, error: '그룹을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 단지들이 모두 존재하는지 확인
    const complexes = await prisma.complex.findMany({
      where: { id: { in: complexIds } }
    });

    if (complexes.length !== complexIds.length) {
      return NextResponse.json(
        { success: false, error: '일부 단지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 단지를 그룹에 추가 (중복은 자동으로 스킵)
    const result = await prisma.complexGroup.createMany({
      data: complexIds.map(complexId => ({
        groupId: params.id,
        complexId
      })),
      skipDuplicates: true
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}개의 단지가 그룹에 추가되었습니다.`,
      addedCount: result.count
    });
  } catch (error) {
    console.error('단지 추가 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '단지를 그룹에 추가하는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/complexes - 그룹에서 단지 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const complexIdsParam = searchParams.get('complexIds');

    if (!complexIdsParam) {
      return NextResponse.json(
        { success: false, error: '단지 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const complexIds = complexIdsParam.split(',');

    // 그룹에서 단지 제거
    const result = await prisma.complexGroup.deleteMany({
      where: {
        groupId: params.id,
        complexId: { in: complexIds }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count}개의 단지가 그룹에서 제거되었습니다.`,
      removedCount: result.count
    });
  } catch (error) {
    console.error('단지 제거 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '단지를 그룹에서 제거하는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
