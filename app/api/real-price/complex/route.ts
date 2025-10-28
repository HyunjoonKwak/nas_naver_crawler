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
import { getRealPriceCache, setRealPriceCache } from '@/lib/real-price-cache';
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

/**
 * 매물 데이터에서 전용면적 -> 공급면적 매핑 생성
 */
function createAreaMapping(articles: { area1: number; area2: number | null }[]) {
  const mapping = new Map<number, { supplyArea: number; supplyPyeong: number }>();

  articles.forEach(article => {
    if (article.area2) {
      // area1이 더 큰 경우: area1=공급, area2=전용 (데이터 반대로 저장됨)
      // area1이 더 작은 경우: area1=전용, area2=공급 (정상)
      const isReversed = article.area1 > article.area2;

      const exclusiveArea = isReversed ? article.area2 : article.area1;
      const supplyArea = isReversed ? article.area1 : article.area2;

      const exclusivePyeong = Math.floor(exclusiveArea / 3.3058);
      const supplyPyeong = Math.floor(supplyArea / 3.3058);

      console.log(`[Area Mapping] area1=${article.area1}, area2=${article.area2} → 전용${exclusivePyeong}평(${exclusiveArea}㎡) → 공급${supplyPyeong}평(${supplyArea}㎡)`);

      // 이미 있으면 스킵 (첫 번째 매물 기준)
      if (!mapping.has(exclusivePyeong)) {
        mapping.set(exclusivePyeong, {
          supplyArea: supplyArea,
          supplyPyeong: supplyPyeong,
        });
      }
    }
  });

  return mapping;
}

/**
 * 전용면적에 해당하는 공급평형 찾기
 */
function findSupplyPyeong(exclusiveArea: number, areaMapping: Map<number, { supplyArea: number; supplyPyeong: number }>): number | null {
  const exclusivePyeong = Math.floor(exclusiveArea / 3.3058);
  const mapped = areaMapping.get(exclusivePyeong);
  return mapped ? mapped.supplyPyeong : null;
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

    // 단지 정보 조회 (매물 면적 정보 포함)
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      select: {
        complexNo: true,
        complexName: true,
        beopjungdong: true,
        address: true,
        lawdCd: true, // 저장된 법정동코드 (5자리)
        articles: {
          select: {
            area1: true, // 전용면적
            area2: true, // 공급면적
          },
        },
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

    // 각 달의 실거래가 조회 (캐싱 적용)
    const allResults = [];
    for (const dealYmd of targetMonths) {
      try {
        // 캐시 확인
        let monthData = await getRealPriceCache(lawdCd, dealYmd);

        if (!monthData) {
          // 캐시 미스: 지역 전체 데이터 API 조회
          monthData = await client.searchAll(lawdCd, dealYmd);

          // 비동기로 캐시 저장 (응답 지연 방지)
          setRealPriceCache(lawdCd, dealYmd, monthData).catch((error) => {
            console.error('[Real Price Complex] Cache save failed:', error);
          });

          // Rate limiting 방지 (API 호출 시에만)
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 메모리에서 아파트명 필터링 (정확히 일치하는 것만)
        const normalizedComplexName = complex.complexName.replace(/\s+/g, '').toLowerCase();
        const filtered = monthData.filter(item => {
          const normalizedItemName = item.aptName.replace(/\s+/g, '').toLowerCase();
          return normalizedItemName === normalizedComplexName;
        });

        allResults.push(...filtered);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to fetch data for ${dealYmd}:`, errorMessage);
      }
    }

    // 날짜순 정렬 (최신순)
    allResults.sort((a, b) => {
      return new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime();
    });

    // 매물 데이터에서 면적 매핑 생성
    const areaMapping = createAreaMapping(complex.articles);

    // 프론트엔드 형식에 맞게 변환
    const formattedItems = allResults.map(item => {
      const [year, month, day] = item.dealDate.split('-');
      const supplyPyeong = findSupplyPyeong(item.area, areaMapping);

      return {
        ...item,
        apartmentName: item.aptName,
        exclusiveArea: item.area,
        supplyPyeong: supplyPyeong, // 공급평형 추가
        dealAmount: item.dealPrice.toString(), // 숫자를 문자열로 (만원 단위)
        dealPrice: item.dealPrice, // 원본 숫자 값 (만원 단위)
        dealPriceFormatted: item.dealPriceFormatted, // 포맷된 문자열 (표시용)
        dealYear: parseInt(year),
        dealMonth: parseInt(month),
        dealDay: parseInt(day),
      };
    });

    // 면적 매핑 정보를 배열로 변환 (프론트엔드에서 사용)
    const areaMappingArray = Array.from(areaMapping.entries()).map(([exclusivePyeong, data]) => ({
      exclusivePyeong,
      supplyPyeong: data.supplyPyeong,
      supplyArea: data.supplyArea,
    }));

    return NextResponse.json({
      success: true,
      data: {
        complex: {
          complexNo: complex.complexNo,
          complexName: complex.complexName,
          beopjungdong: complex.beopjungdong,
          lawdCd,
        },
        areaMapping: areaMappingArray, // 면적 매핑 정보 추가
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
