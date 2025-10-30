/**
 * 지역별 전월세 실거래가 검색 API
 * GET /api/rent-price/search?lawdCd={lawdCd}&dealYmd={dealYmd}&aptName={aptName}
 *
 * 쿼리 파라미터:
 * - lawdCd: 법정동코드 5자리 (필수)
 * - dealYmd: 거래년월 YYYYMM (필수)
 * - aptName: 아파트명 필터 (선택)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRentPriceApiClient } from '@/lib/rent-price-api';
import { getRentPriceCache, setRentPriceCache } from '@/lib/rent-price-cache';

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
    const lawdCd = searchParams.get('lawdCd');
    const dealYmd = searchParams.get('dealYmd');
    const aptName = searchParams.get('aptName');

    // 필수 파라미터 검증
    if (!lawdCd || !dealYmd) {
      return NextResponse.json(
        { error: 'lawdCd and dealYmd are required' },
        { status: 400 }
      );
    }

    // 법정동코드 형식 검증 (5자리)
    if (lawdCd.length !== 5 || !/^\d{5}$/.test(lawdCd)) {
      return NextResponse.json(
        { error: 'Invalid lawdCd format. Must be 5 digits.' },
        { status: 400 }
      );
    }

    // 거래년월 형식 검증 (YYYYMM)
    if (dealYmd.length !== 6 || !/^\d{6}$/.test(dealYmd)) {
      return NextResponse.json(
        { error: 'Invalid dealYmd format. Must be YYYYMM.' },
        { status: 400 }
      );
    }

    // 캐시 확인
    let items = await getRentPriceCache(lawdCd, dealYmd);

    if (!items) {
      // 캐시 미스: API 호출
      const client = getRentPriceApiClient();
      items = await client.searchAll(lawdCd, dealYmd);

      // 비동기로 캐시 저장
      setRentPriceCache(lawdCd, dealYmd, items).catch((error) => {
        console.error('[Rent Price Search] Cache save failed:', error);
      });
    }

    // 아파트명 필터링 (선택)
    if (aptName) {
      const normalizedSearchName = aptName.replace(/\s+/g, '').toLowerCase();
      items = items.filter(item => {
        const normalizedItemName = item.aptName.replace(/\s+/g, '').toLowerCase();
        return normalizedItemName.includes(normalizedSearchName);
      });
    }

    // 응답 형식 변환 (real-price/search와 동일한 구조)
    const formattedItems = items.map(item => {
      const [year, month, day] = item.dealDate.split('-');

      return {
        aptName: item.aptName,
        aptDong: item.aptDong,
        dealPrice: item.deposit, // 전월세는 보증금을 주 가격으로 사용
        dealPriceFormatted: item.depositFormatted, // 보증금을 주 가격으로
        deposit: item.deposit,
        monthlyRent: item.monthlyRent,
        depositFormatted: item.depositFormatted,
        monthlyRentFormatted: item.monthlyRentFormatted,
        dealDate: item.dealDate,
        address: item.address, // ProcessedRentPrice의 address 사용
        dong: item.dong,
        jibun: item.jibun,
        area: item.area,
        areaPyeong: Math.floor(item.area / 3.3058),
        floor: item.floor,
        buildYear: item.buildYear,
        tradeType: item.tradeType, // '전세' or '월세'
        dealMethod: item.dealMethod || '중개거래',
        pricePerPyeong: Math.round(item.deposit / (item.area / 3.3058)), // 보증금 기준 평당가
        rgstDate: item.dealDate, // 전월세는 dealDate를 rgstDate로 사용
        contractType: item.contractType,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        lawdCd,
        dealYmd,
        items: formattedItems,
        totalCount: formattedItems.length,
      },
    });
  } catch (error: unknown) {
    console.error('Rent price search error:', error);

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
