/**
 * 기존 단지들의 법정동 정보를 역지오코딩으로 자동 수집하는 배치 스크립트
 *
 * 사용법:
 *   npx tsx scripts/geocode-existing-complexes.ts
 *
 * 기능:
 *   - 좌표는 있지만 법정동 정보가 없는 단지를 찾아서 역지오코딩 수행
 *   - SGIS API를 사용하여 법정동, 행정동, 주소 정보 자동 수집
 *   - Rate limiting을 고려한 안전한 배치 처리
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GeocodeResponse {
  success: boolean;
  data?: {
    beopjungdong: string;
    haengjeongdong: string;
    sidoCode: string;
    sigunguCode: string;
    dongCode: string;
    lawdCd: string;
    fullAddress: string;
  };
  error?: string;
}

async function geocodeComplex(latitude: number, longitude: number): Promise<GeocodeResponse> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const geocodeUrl = `${baseUrl}/api/geocode?latitude=${latitude}&longitude=${longitude}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🚀 Starting batch geocoding for existing complexes...\n');

  // 1. 좌표는 있지만 법정동 코드가 없는 단지 찾기 (beopjungdong은 있지만 sidoCode가 없는 경우도 포함)
  const complexesNeedingGeocode = await prisma.complex.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      OR: [
        { beopjungdong: null },
        { sidoCode: null },
        { sigunguCode: null },
      ],
    },
    select: {
      id: true,
      complexNo: true,
      complexName: true,
      latitude: true,
      longitude: true,
      address: true,
    },
  });

  console.log(`📊 Found ${complexesNeedingGeocode.length} complexes needing geocoding\n`);

  if (complexesNeedingGeocode.length === 0) {
    console.log('✅ All complexes already have complete geocoding information!');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  // 2. 각 단지에 대해 역지오코딩 수행
  for (let i = 0; i < complexesNeedingGeocode.length; i++) {
    const complex = complexesNeedingGeocode[i];
    const progress = `[${i + 1}/${complexesNeedingGeocode.length}]`;

    console.log(`${progress} Processing: ${complex.complexName} (${complex.complexNo})`);

    try {
      const result = await geocodeComplex(complex.latitude!, complex.longitude!);

      if (result.success && result.data) {
        // DB 업데이트
        await prisma.complex.update({
          where: { id: complex.id },
          data: {
            beopjungdong: result.data.beopjungdong,
            haengjeongdong: result.data.haengjeongdong,
            sidoCode: result.data.sidoCode,
            sigunguCode: result.data.sigunguCode,
            dongCode: result.data.dongCode,
            lawdCd: result.data.lawdCd, // 법정동코드 (5자리) 저장
            // 기존 주소가 없으면 역지오코딩으로 얻은 주소 사용
            address: complex.address || result.data.fullAddress,
          },
        });

        console.log(`  ✅ Success: ${result.data.beopjungdong} (법정동코드: ${result.data.lawdCd})`);
        successCount++;
      } else {
        console.log(`  ❌ Failed: ${result.error || 'Unknown error'}`);
        failCount++;
        errors.push(`${complex.complexNo}: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      failCount++;
      errors.push(`${complex.complexNo}: ${error.message}`);
    }

    // Rate limiting 방지 (SGIS API 호출 제한)
    if (i < complexesNeedingGeocode.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 3. 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 Batch Geocoding Summary');
  console.log('='.repeat(60));
  console.log(`Total complexes processed: ${complexesNeedingGeocode.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
  }

  console.log('\n✨ Batch geocoding completed!');
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
