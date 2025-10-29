import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ApiResponseHelper } from '@/lib/api-response';

/**
 * POST /api/favorites/quick-add
 *
 * 실거래가 페이지에서 아파트명으로 빠르게 즐겨찾기 추가
 * - 아파트명으로 Complex 검색 또는 생성
 * - 즐겨찾기에 추가
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { aptName, lawdCd, address } = body;

    if (!aptName) {
      return NextResponse.json(
        { success: false, error: '아파트명이 필요합니다' },
        { status: 400 }
      );
    }

    // 1. 아파트명으로 Complex 검색
    let complex = await prisma.complex.findFirst({
      where: {
        complexName: {
          contains: aptName,
        },
      },
    });

    // 2. Complex가 없으면 생성 (임시 complexNo 사용)
    if (!complex) {
      // complexNo 생성: lawdCd + timestamp
      const tempComplexNo = lawdCd ? `${lawdCd}_${Date.now()}` : `TEMP_${Date.now()}`;

      complex = await prisma.complex.create({
        data: {
          complexNo: tempComplexNo,
          complexName: aptName,
          lawdCd: lawdCd || null,
          address: address || null,
          beopjungdong: null,
          haengjeongdong: null,
          userId: session.user.id, // userId 추가
        },
      });
    }

    // 3. 즐겨찾기 확인
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        complexId_userId: {
          complexId: complex.id,
          userId: session.user.id,
        },
      },
    });

    if (existingFavorite) {
      return NextResponse.json({
        success: true,
        data: {
          complexNo: complex.complexNo,
          complexId: complex.id,
          alreadyFavorite: true
        },
        message: '이미 즐겨찾기에 추가된 단지입니다'
      });
    }

    // 4. 즐겨찾기 추가
    await prisma.favorite.create({
      data: {
        userId: session.user.id,
        complexId: complex.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        complexNo: complex.complexNo,
        complexId: complex.id,
        complexName: complex.complexName,
      },
      message: '즐겨찾기에 추가되었습니다'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Quick Add Favorite Error]:', error);
    return NextResponse.json(
      { success: false, error: '즐겨찾기 추가 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
