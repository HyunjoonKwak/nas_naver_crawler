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
import { getRealPriceCache, setRealPriceCache } from '@/lib/real-price-cache';
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

    // 전체 데이터 가져오기 (페이징 자동 처리)
    let items: any[];

    if (aptName) {
      // 아파트명 필터링: 일단 캐시 없이 직접 조회 (Phase 1)
      // TODO Phase 2: 캐시에서 가져와서 메모리 필터링
      items = await client.searchByAptName(lawdCd, dealYmd, aptName);
    } else {
      // 전체 조회: 캐싱 적용
      const cached = await getRealPriceCache(lawdCd, dealYmd);

      if (cached) {
        // 캐시 히트
        items = cached;
      } else {
        // 캐시 미스: API 호출
        items = await client.searchAll(lawdCd, dealYmd);

        // 비동기로 캐시 저장 (응답 지연 방지)
        setRealPriceCache(lawdCd, dealYmd, items).catch((error) => {
          console.error('[Real Price Search] Cache save failed:', error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        totalCount: items.length,
        pageNo: 1,
        numOfRows: items.length,
      },
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
