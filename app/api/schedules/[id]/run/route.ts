/**
 * 스케줄 즉시 실행 API
 * POST: 스케줄을 예약 시간과 상관없이 즉시 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScheduleNow } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/schedules/[id]/run - 스케줄 즉시 실행
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await runScheduleNow(params.id);

    // 중복 실행 방지 (이미 실행 중)
    if (result === 'already_running') {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule is already running',
          code: 'ALREADY_RUNNING',
        },
        { status: 409 } // Conflict
      );
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to run schedule',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule is running',
    });
  } catch (error: any) {
    console.error('Failed to run schedule:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run schedule',
      },
      { status: 500 }
    );
  }
}
