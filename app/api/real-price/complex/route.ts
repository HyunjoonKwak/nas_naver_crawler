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

/**
 * 법정동명에서 법정동코드 추출 (간단한 매핑)
 * 실제 운영 시에는 공공데이터포털의 법정동코드 API나 DB를 활용해야 합니다.
 *
 * 참고: https://www.code.go.kr/stdcode/regCodeL.do
 */
function getBeopjungdongCode(beopjungdong: string): string | null {
  // 서울 주요 구 매핑 (예시)
  const seoulMapping: Record<string, string> = {
    '종로구': '11110',
    '중구': '11140',
    '용산구': '11170',
    '성동구': '11200',
    '광진구': '11215',
    '동대문구': '11230',
    '중랑구': '11260',
    '성북구': '11290',
    '강북구': '11305',
    '도봉구': '11320',
    '노원구': '11350',
    '은평구': '11380',
    '서대문구': '11410',
    '마포구': '11440',
    '양천구': '11470',
    '강서구': '11500',
    '구로구': '11530',
    '금천구': '11545',
    '영등포구': '11560',
    '동작구': '11590',
    '관악구': '11620',
    '서초구': '11650',
    '강남구': '11680',
    '송파구': '11710',
    '강동구': '11740',
  };

  // TODO: 전국 시군구 코드 매핑 필요
  // 현재는 서울만 지원

  // 법정동에서 구 이름 추출
  for (const [guName, code] of Object.entries(seoulMapping)) {
    if (beopjungdong && beopjungdong.includes(guName)) {
      return code;
    }
  }

  return null;
}

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
        sidoCode: true,
        sigunguCode: true,
        dongCode: true,
        address: true,
      },
    });

    if (!complex) {
      return NextResponse.json(
        { error: 'Complex not found' },
        { status: 404 }
      );
    }

    // 법정동코드 추출 (SGIS 코드 우선, 없으면 기존 매핑 함수 사용)
    let lawdCd: string | null = null;

    if (complex.sidoCode && complex.sigunguCode) {
      // SGIS에서 받은 코드로 법정동코드 생성 (시도 2자리 + 시군구 3자리)
      lawdCd = complex.sidoCode + complex.sigunguCode;
      console.log(`[Real Price] Using SGIS lawdCd: ${lawdCd} for ${complex.complexName}`);
    } else if (complex.beopjungdong) {
      // 기존 매핑 함수 사용 (레거시 지원)
      lawdCd = getBeopjungdongCode(complex.beopjungdong);
      console.log(`[Real Price] Using legacy mapping lawdCd: ${lawdCd} for ${complex.complexName}`);
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
            sidoCode: complex.sidoCode,
            sigunguCode: complex.sigunguCode,
          },
        },
        { status: 400 }
      );
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
        items: allResults,
        totalCount: allResults.length,
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
