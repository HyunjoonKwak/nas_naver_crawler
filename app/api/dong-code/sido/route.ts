/**
 * 시/도 목록 조회 API
 * GET /api/dong-code/sido
 */

import { NextResponse } from 'next/server';
import { loadDongCodeData } from '@/lib/dong-code';

export async function GET() {
  try {
    const dongCodes = loadDongCodeData();

    // 시/도 목록 중복 제거
    const sidoSet = new Set<string>();
    const sidoList: { code: string; name: string }[] = [];

    dongCodes.forEach(entry => {
      if (!sidoSet.has(entry.sidoCode)) {
        sidoSet.add(entry.sidoCode);
        sidoList.push({
          code: entry.sidoCode,
          name: entry.sido,
        });
      }
    });

    // 정렬
    sidoList.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      success: true,
      results: sidoList,
      count: sidoList.length,
    });
  } catch (error: unknown) {
    console.error('Sido list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: '시/도 목록 조회 실패', details: errorMessage },
      { status: 500 }
    );
  }
}
