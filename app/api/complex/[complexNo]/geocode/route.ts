/**
 * 단지 역지오코딩 API
 *
 * 특정 단지의 좌표를 사용하여 역지오코딩을 수행하고 법정동 정보를 업데이트합니다.
 * 주로 상세 페이지에서 법정동 정보가 없을 때 자동으로 호출됩니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { complexNo: string } }
) {
  const { complexNo } = params;

  try {
    // 1. 단지 정보 조회
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      select: {
        id: true,
        complexNo: true,
        complexName: true,
        latitude: true,
        longitude: true,
        beopjungdong: true,
        haengjeongdong: true,
        address: true,
      },
    });

    if (!complex) {
      return NextResponse.json(
        { error: 'Complex not found' },
        { status: 404 }
      );
    }

    // 2. 이미 법정동 정보가 있으면 스킵
    if (complex.beopjungdong) {
      return NextResponse.json({
        success: true,
        message: 'Complex already has beopjungdong',
        data: {
          beopjungdong: complex.beopjungdong,
          haengjeongdong: complex.haengjeongdong,
        },
      });
    }

    // 3. 좌표 정보 확인
    if (!complex.latitude || !complex.longitude) {
      return NextResponse.json(
        {
          error: 'Complex does not have coordinate information',
          message: '단지의 좌표 정보가 없어서 역지오코딩을 수행할 수 없습니다.',
        },
        { status: 400 }
      );
    }

    // 4. 역지오코딩 수행
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const geocodeUrl = `${baseUrl}/api/geocode?latitude=${complex.latitude}&longitude=${complex.longitude}`;

    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

    if (!geocodeData.success || !geocodeData.data) {
      return NextResponse.json(
        {
          error: 'Geocoding failed',
          message: geocodeData.error || '역지오코딩에 실패했습니다.',
        },
        { status: 500 }
      );
    }

    // 5. DB 업데이트
    const updatedComplex = await prisma.complex.update({
      where: { id: complex.id },
      data: {
        beopjungdong: geocodeData.data.beopjungdong || null,
        haengjeongdong: geocodeData.data.haengjeongdong || null,
        sidoCode: geocodeData.data.sidoCode || null,
        sigunguCode: geocodeData.data.sigunguCode || null,
        dongCode: geocodeData.data.dongCode || null,
        lawdCd: geocodeData.data.lawdCd || null, // 법정동코드 (5자리)
        // 기존 주소가 없으면 역지오코딩으로 얻은 주소 사용
        address: complex.address || geocodeData.data.fullAddress || null,
      },
    });

    console.log(`✅ Geocoded on-demand: ${complex.complexName} (${complexNo}) → ${geocodeData.data.beopjungdong} (법정동코드: ${geocodeData.data.lawdCd})`);

    return NextResponse.json({
      success: true,
      message: '법정동 정보가 업데이트되었습니다.',
      data: {
        beopjungdong: updatedComplex.beopjungdong,
        haengjeongdong: updatedComplex.haengjeongdong,
        address: updatedComplex.address,
      },
    });

  } catch (error: any) {
    console.error(`[Geocode Error] Failed for complex ${complexNo}:`, error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || '역지오코딩 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
