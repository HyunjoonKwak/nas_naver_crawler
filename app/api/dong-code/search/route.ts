/**
 * 법정동코드 검색 API
 * GET /api/dong-code/search?query=강남구
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadDongCodeData } from '@/lib/dong-code';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: '검색어는 최소 2자 이상 입력해주세요' },
        { status: 400 }
      );
    }

    // 법정동코드 데이터 로드
    const dongCodes = loadDongCodeData();

    // 검색어로 필터링 (대소문자, 공백 무시)
    const normalizedQuery = query.replace(/\s+/g, '').toLowerCase();

    const results = dongCodes
      .filter(entry => {
        const normalizedName = entry.dongName.replace(/\s+/g, '').toLowerCase();
        return normalizedName.includes(normalizedQuery);
      })
      .slice(0, 50) // 최대 50개 결과
      .map(entry => ({
        code: entry.sggCode,
        name: entry.dongName,
        sido: entry.sido,
        sigungu: entry.sigungu,
        dong: entry.dongOnly,
      }));

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length,
    });
  } catch (error: unknown) {
    console.error('Dong code search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: '법정동코드 검색 중 오류가 발생했습니다', details: errorMessage },
      { status: 500 }
    );
  }
}
