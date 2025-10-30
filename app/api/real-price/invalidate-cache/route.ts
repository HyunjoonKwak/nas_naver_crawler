import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invalidateRealPriceCache } from '@/lib/real-price-cache';

/**
 * 실거래가 캐시 무효화 API
 *
 * POST /api/real-price/invalidate-cache
 * Body: { lawdCd: string, dealYmd: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 요청 파라미터 파싱
    const body = await request.json();
    const { lawdCd, dealYmd } = body;

    if (!lawdCd || !dealYmd) {
      return NextResponse.json(
        { success: false, error: 'lawdCd and dealYmd are required' },
        { status: 400 }
      );
    }

    // 캐시 무효화
    await invalidateRealPriceCache(lawdCd, dealYmd);

    console.log(`[Real Price Cache] Invalidated by user ${session.user.email}: ${lawdCd}-${dealYmd}`);

    return NextResponse.json({
      success: true,
      message: `캐시가 삭제되었습니다 (${lawdCd}-${dealYmd})`,
    });
  } catch (error) {
    console.error('[Real Price Cache Invalidate API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
