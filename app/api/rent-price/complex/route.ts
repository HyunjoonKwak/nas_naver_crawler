/**
 * 단지별 전월세 실거래가 조회 API
 * GET /api/rent-price/complex?complexNo={complexNo}&months={months}
 *
 * 쿼리 파라미터:
 * - complexNo: 네이버 단지 번호 (필수)
 * - months: 조회할 개월 수 (선택, 기본: 3)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRentPriceApiClient } from '@/lib/rent-price-api';
import { getRentPriceCache, setRentPriceCache } from '@/lib/rent-price-cache';
import { getServerSession } from 'next-auth/next';
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
    const months = monthsParam ? parseInt(monthsParam, 10) : 3;

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
        realPriceAptName: true, // 실거래가 API용 수동 매핑 이름 (전월세도 동일 이름 사용)
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
      console.log(`[Rent Price] Extracted lawdCd from address: ${lawdCd} for ${complex.complexName}`);
    }

    if (!lawdCd && complex.beopjungdong) {
      // 법정동명에서 검색
      lawdCd = findSggCodeByName(complex.beopjungdong);
      console.log(`[Rent Price] Found lawdCd from beopjungdong: ${lawdCd} for ${complex.complexName}`);
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
      console.log(`[Rent Price] Saved lawdCd to DB: ${lawdCd} for ${complex.complexName}`);
    }

    // 최근 N개월 조회
    const targetMonths = getRecentMonths(months);
    const client = getRentPriceApiClient();

    // 각 달의 전월세 실거래가 조회 (캐싱 적용)
    const allResults = [];
    for (const dealYmd of targetMonths) {
      try {
        // 캐시 확인
        let monthData = await getRentPriceCache(lawdCd, dealYmd);

        if (!monthData) {
          // 캐시 미스: 지역 전체 데이터 API 조회
          monthData = await client.searchAll(lawdCd, dealYmd);

          // 비동기로 캐시 저장 (응답 지연 방지)
          setRentPriceCache(lawdCd, dealYmd, monthData).catch((error) => {
            console.error('[Rent Price Complex] Cache save failed:', error);
          });

          // Rate limiting 방지 (API 호출 시에만)
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 메모리에서 아파트명 필터링 (유사도 매칭)
        // realPriceAptName이 설정되어 있으면 우선 사용 (수동 매핑)
        const searchName = complex.realPriceAptName || complex.complexName;
        const normalizedComplexName = searchName.replace(/\s+/g, '').toLowerCase();

        const filtered = monthData.filter(item => {
          const normalizedItemName = item.aptName.replace(/\s+/g, '').toLowerCase();

          // 1. 정확 매칭
          if (normalizedItemName === normalizedComplexName) {
            return true;
          }

          // 2. 노이즈 단어 제거 후 정규화 (단지명 변형 처리)
          const noiseWords = ['마을', '단지', '아파트', 'apt', '블록', '동', '차'];
          let cleanedItemName = normalizedItemName;
          let cleanedSearchName = normalizedComplexName;

          noiseWords.forEach(word => {
            cleanedItemName = cleanedItemName.replace(new RegExp(word, 'g'), '');
            cleanedSearchName = cleanedSearchName.replace(new RegExp(word, 'g'), '');
          });

          // 2-1. 노이즈 제거 후 정확 매칭
          if (cleanedItemName === cleanedSearchName && cleanedSearchName.length >= 4) {
            return true;
          }

          // 3. 토큰 기반 매칭 (순서 무관, 엄격한 조건)
          const extractTokens = (str: string) => {
            // 한글, 숫자, 영문을 토큰으로 분리
            const tokens: string[] = [];
            const koreanMatch = str.match(/[가-힣]+/g);
            const numberMatch = str.match(/\d+/g);
            const englishMatch = str.match(/[a-z]+/gi);

            if (koreanMatch) tokens.push(...koreanMatch);
            if (numberMatch) tokens.push(...numberMatch);
            if (englishMatch) tokens.push(...englishMatch.map(t => t.toLowerCase()));

            return tokens.filter(t => t.length >= 2 && !noiseWords.includes(t)); // 2글자 이상, 노이즈 제외
          };

          const itemTokens = extractTokens(normalizedItemName);
          const searchTokens = extractTokens(normalizedComplexName);

          // 검색어 토큰이 모두 API 데이터에 포함되어 있는지 확인
          const allSearchTokensFound = searchTokens.every(searchToken =>
            itemTokens.some(itemToken =>
              itemToken.includes(searchToken) || searchToken.includes(itemToken)
            )
          );

          // 토큰 매칭 조건 강화
          const isValidTokenMatch = allSearchTokensFound && (
            searchTokens.length >= 3 ||
            (searchTokens.length === 2 && searchTokens.every(t => t.length >= 3))
          );

          if (isValidTokenMatch) {
            return true;
          }

          return false;
        });

        allResults.push(...filtered);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to fetch rent price data for ${dealYmd}:`, errorMessage);
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
          realPriceAptName: complex.realPriceAptName,
          beopjungdong: complex.beopjungdong,
          lawdCd,
        },
        months: targetMonths,
        items: formattedItems,
        totalCount: formattedItems.length,
      },
    });
  } catch (error: unknown) {
    console.error('Rent price complex search error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // API 키 설정 오류
    if (errorMessage.includes('PUBLIC_DATA_SERVICE_KEY')) {
      return NextResponse.json(
        {
          error: 'Rent price API is not configured. Please set PUBLIC_DATA_SERVICE_KEY in environment variables.',
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
