/**
 * 스케줄 즉시 실행 API
 * POST: 스케줄을 예약 시간과 상관없이 즉시 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScheduleNow } from '@/lib/scheduler';

/**
 * POST /api/schedules/[id]/run - 스케줄 즉시 실행
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await runScheduleNow(params.id);

    if (!success) {
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
