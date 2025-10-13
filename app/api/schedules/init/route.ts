/**
 * 스케줄 초기화 API
 * 서버 시작 시 모든 활성 스케줄을 로드
 */

import { NextResponse } from 'next/server';
import { loadAllSchedules } from '@/lib/scheduler';

/**
 * GET /api/schedules/init - 스케줄 초기화
 */
export async function GET() {
  try {
    const loadedCount = await loadAllSchedules();

    return NextResponse.json({
      success: true,
      message: `Loaded ${loadedCount} schedule(s)`,
      count: loadedCount,
    });
  } catch (error: any) {
    console.error('Failed to initialize schedules:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize schedules',
      },
      { status: 500 }
    );
  }
}
