/**
 * 읍/면/동 목록 조회 API
 * GET /api/dong-code/dong?sggCode=11110
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadDongCodeData } from '@/lib/dong-code';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sggCode = searchParams.get('sggCode');

    if (!sggCode) {
      return NextResponse.json(
        { error: 'sggCode 파라미터가 필요합니다 (5자리 시군구 코드)' },
        { status: 400 }
      );
    }

    const dongCodes = loadDongCodeData();

    // 해당 시/군/구의 읍/면/동 목록
    const dongList = dongCodes
      .filter(entry => entry.sggCode === sggCode)
      .map(entry => ({
        code: entry.dongCode, // 8자리
        fullCode: entry.fullCode, // 10자리 전체
        name: entry.dongOnly,
        fullName: entry.dongName,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      success: true,
      results: dongList,
      count: dongList.length,
    });
  } catch (error: unknown) {
    console.error('Dong list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: '읍/면/동 목록 조회 실패', details: errorMessage },
      { status: 500 }
    );
  }
}
