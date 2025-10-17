import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/favorites/reorder
 * 관심단지 순서 변경 (DB 기반)
 *
 * 순서 변경 방법: 각 favorite의 createdAt을 업데이트하여 순서 반영
 * - 새로운 순서대로 createdAt을 1초 간격으로 업데이트
 * - 이후 GET /api/favorites에서 createdAt 기준 정렬 시 원하는 순서로 표시됨
 */
export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();
    const { complexNos } = body; // complexNo 배열 (새로운 순서대로)

    if (!Array.isArray(complexNos)) {
      return NextResponse.json(
        { error: 'complexNos must be an array' },
        { status: 400 }
      );
    }

    // 현재 사용자의 즐겨찾기만 순서 변경 가능
    // 각 complexNo에 대해 순서대로 createdAt 업데이트
    const baseTime = new Date();

    for (let i = 0; i < complexNos.length; i++) {
      const complexNo = complexNos[i];

      // 해당 단지 찾기
      const complex = await prisma.complex.findUnique({
        where: { complexNo },
      });

      if (!complex) continue;

      // 사용자의 favorite 업데이트 (createdAt을 순서에 맞게 변경)
      const newCreatedAt = new Date(baseTime.getTime() + i * 1000); // 1초 간격

      await prisma.favorite.updateMany({
        where: {
          complexId: complex.id,
          userId: currentUser.id, // 본인 것만 수정
        },
        data: {
          createdAt: newCreatedAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
    });
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
