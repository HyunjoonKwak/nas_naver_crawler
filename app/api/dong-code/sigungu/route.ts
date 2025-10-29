/**
 * 시/군/구 목록 조회 API
 * GET /api/dong-code/sigungu?sidoCode=11
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadDongCodeData } from '@/lib/dong-code';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sidoCode = searchParams.get('sidoCode');

    if (!sidoCode) {
      return NextResponse.json(
        { error: 'sidoCode 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const dongCodes = loadDongCodeData();

    // 해당 시/도의 시/군/구 목록 중복 제거
    const sigunguSet = new Set<string>();
    const sigunguList: { code: string; name: string; fullCode: string }[] = [];

    dongCodes
      .filter(entry => entry.sidoCode === sidoCode)
      .forEach(entry => {
        if (!sigunguSet.has(entry.sggCode)) {
          sigunguSet.add(entry.sggCode);

          // dongName에서 시/도를 제외한 나머지 부분 추출
          // 예: "경기도 수원시 장안구" → "수원시 장안구"
          // 예: "경기도 화성시" → "화성시"
          const parts = entry.dongName.split(' ');
          const nameWithoutSido = parts.slice(1).join(' ');

          sigunguList.push({
            code: entry.sggCode.substring(2, 5), // 3자리 시군구 코드 (2~5번째)
            name: nameWithoutSido,
            fullCode: entry.sggCode, // 5자리 전체 코드
          });
        }
      });

    // 정렬
    sigunguList.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      success: true,
      results: sigunguList,
      count: sigunguList.length,
    });
  } catch (error: unknown) {
    console.error('Sigungu list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: '시/군/구 목록 조회 실패', details: errorMessage },
      { status: 500 }
    );
  }
}
