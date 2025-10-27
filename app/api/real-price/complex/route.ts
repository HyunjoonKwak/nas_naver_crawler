/**
 * 단지별 실거래가 조회 API
 * GET /api/real-price/complex?complexNo={complexNo}&months={months}
 *
 * 쿼리 파라미터:
 * - complexNo: 네이버 단지 번호 (필수)
 * - months: 조회할 개월 수 (선택, 기본: 3, 최대: 12)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealPriceApiClient } from '@/lib/real-price-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractSggCodeFromAddress, findSggCodeByName } from '@/lib/dong-code';

/**
 * 최근 N개월의 YYYYMM 배열 생성
 */
function getRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];

  for (let i = 0; i < count; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    months.push(`${year}${month}`);
  }

  return months;
}

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 추출
    const searchParams = request.nextUrl.searchParams;
    const complexNo = searchParams.get('complexNo');
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? Math.min(parseInt(monthsParam, 10), 12) : 3;

    // 필수 파라미터 검증
    if (!complexNo) {
      return NextResponse.json(
        { error: 'complexNo is required' },
        { status: 400 }
      );
    }

    // 단지 정보 조회
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      select: {
        complexNo: true,
        complexName: true,
        beopjungdong: true,
        address: true,
        lawdCd: true, // 저장된 법정동코드 (5자리)
      },
    });

    if (!complex) {
      return NextResponse.json(
        { error: 'Complex not found' },
        { status: 404 }
      );
    }

    // 법정동코드 추출 (우선순위: DB > 주소에서 추출 > 법정동명에서 검색)
    let lawdCd: string | null = complex.lawdCd || null;

    if (!lawdCd && complex.address) {
      // 주소에서 자동 추출 (dong_code_active.txt 활용)
      lawdCd = extractSggCodeFromAddress(complex.address);
      console.log(`[Real Price] Extracted lawdCd from address: ${lawdCd} for ${complex.complexName}`);
    }

    if (!lawdCd && complex.beopjungdong) {
      // 법정동명에서 검색
      lawdCd = findSggCodeByName(complex.beopjungdong);
      console.log(`[Real Price] Found lawdCd from beopjungdong: ${lawdCd} for ${complex.complexName}`);
    }

    if (!lawdCd) {
      return NextResponse.json(
        {
          error: 'Cannot determine beopjungdong code for this complex',
          message: `법정동 코드 정보가 없습니다. 단지 상세 페이지를 한번 열어보시면 자동으로 역지오코딩이 수행됩니다.`,
          complex: {
            complexNo: complex.complexNo,
            complexName: complex.complexName,
            beopjungdong: complex.beopjungdong,
            address: complex.address,
            lawdCd: complex.lawdCd,
          },
          hint: 'dong_code_active.txt 파일에서 해당 지역을 찾을 수 없습니다.',
        },
        { status: 400 }
      );
    }

    // 법정동코드를 찾았는데 DB에 없으면 저장
    if (lawdCd && !complex.lawdCd) {
      await prisma.complex.update({
        where: { complexNo },
        data: { lawdCd },
      });
      console.log(`[Real Price] Saved lawdCd to DB: ${lawdCd} for ${complex.complexName}`);
    }

    // 최근 N개월 조회
    const targetMonths = getRecentMonths(months);
    const client = getRealPriceApiClient();

    // 각 달의 실거래가 조회 (아파트명 필터링)
    const allResults = [];
    for (const dealYmd of targetMonths) {
      try {
        const items = await client.searchByAptName(
          lawdCd,
          dealYmd,
          complex.complexName
        );
        allResults.push(...items);

        // Rate limiting 방지
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to fetch data for ${dealYmd}:`, errorMessage);
      }
    }

    // 날짜순 정렬 (최신순)
    allResults.sort((a, b) => {
      return new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime();
    });

    // 프론트엔드 형식에 맞게 변환
    const formattedItems = allResults.map(item => {
      const [year, month, day] = item.dealDate.split('-');
      return {
        ...item,
        apartmentName: item.aptName,
        exclusiveArea: item.area,
        dealAmount: item.dealPriceFormatted,
        dealYear: parseInt(year),
        dealMonth: parseInt(month),
        dealDay: parseInt(day),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        complex: {
          complexNo: complex.complexNo,
          complexName: complex.complexName,
          beopjungdong: complex.beopjungdong,
          lawdCd,
        },
        months: targetMonths,
        items: formattedItems,
        totalCount: formattedItems.length,
      },
    });
  } catch (error: unknown) {
    console.error('Real price complex search error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // API 키 설정 오류
    if (errorMessage.includes('PUBLIC_DATA_SERVICE_KEY')) {
      return NextResponse.json(
        {
          error: 'Real price API is not configured. Please set PUBLIC_DATA_SERVICE_KEY in environment variables.',
        },
        { status: 503 }
      );
    }

    // 기타 에러
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
