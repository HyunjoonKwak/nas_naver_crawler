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

          // 시/군/구 이름 구성:
          // - 구가 있는 경우 (00000으로 끝남): "수원시 장안구"
          // - 구가 없는 경우: "광명시", "평택시" (읍/면/동 제외)
          let displayName: string;

          if (entry.fullCode.endsWith('00000')) {
            // 구 레벨: dongName에서 시/도 제외하고 전체 표시
            // 예: "경기도 수원시 장안구" → "수원시 장안구"
            const parts = entry.dongName.split(' ');
            displayName = parts.slice(1).join(' ');
          } else {
            // 시/군 레벨: sigungu만 표시 (동/읍/면 제외)
            // 예: "광명시", "평택시"
            displayName = entry.sigungu;
          }

          sigunguList.push({
            code: entry.sggCode.substring(2, 5), // 3자리 시군구 코드 (2~5번째)
            name: displayName,
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
