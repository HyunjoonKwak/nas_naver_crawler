/**
 * 실거래가 검색 API
 * GET /api/real-price/search
 *
 * 쿼리 파라미터:
 * - lawdCd: 법정동코드 (5자리, 필수)
 * - dealYmd: 거래년월 (YYYYMM, 필수)
 * - aptName: 아파트명 (선택)
 * - pageNo: 페이지 번호 (선택, 기본: 1)
 * - numOfRows: 페이지당 결과 수 (선택, 기본: 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRealPriceApiClient } from '@/lib/real-price-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const pageNo = parseInt(searchParams.get('pageNo') || '1', 10);
    const numOfRows = parseInt(searchParams.get('numOfRows') || '100', 10);

    // 필수 파라미터 검증
    if (!lawdCd || !dealYmd) {
      return NextResponse.json(
        { error: 'lawdCd and dealYmd are required' },
        { status: 400 }
      );
    }

    // 법정동코드 검증 (5자리 숫자)
    if (!/^\d{5}$/.test(lawdCd)) {
      return NextResponse.json(
        { error: 'lawdCd must be 5 digits' },
        { status: 400 }
      );
    }

    // 거래년월 검증 (YYYYMM)
    if (!/^\d{6}$/.test(dealYmd)) {
      return NextResponse.json(
        { error: 'dealYmd must be in YYYYMM format' },
        { status: 400 }
      );
    }

    // API 클라이언트 가져오기
    const client = getRealPriceApiClient();

    // 아파트명 필터링 여부에 따라 다른 메서드 호출
    let result;
    if (aptName) {
      const items = await client.searchByAptName(lawdCd, dealYmd, aptName);
      result = {
        items,
        totalCount: items.length,
        pageNo: 1,
        numOfRows: items.length,
      };
    } else {
      result = await client.search({
        lawdCd,
        dealYmd,
        pageNo,
        numOfRows,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Real price search error:', error);

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
