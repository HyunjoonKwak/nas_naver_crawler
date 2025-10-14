import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/complex-info?complexNo=123456
 * 단지 정보를 조회합니다.
 * 1. DB에서 먼저 조회
 * 2. 없으면 네이버 API에서 직접 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const complexNo = searchParams.get('complexNo');

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. DB에서 먼저 조회
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
      include: {
        articles: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }
      }
    });

    if (complex) {
      // DB에 있으면 DB 정보 반환
      const articleCount = await prisma.article.count({
        where: { complexId: complex.id }
      });

      return NextResponse.json({
        success: true,
        source: 'database',
        complex: {
          complexNo: complex.complexNo,
          complexName: complex.complexName,
          totalHousehold: complex.totalHousehold,
          totalDong: complex.totalDong,
          address: complex.address,
          roadAddress: complex.roadAddress,
          articleCount,
          lastCrawledAt: complex.articles[0]?.updatedAt?.toISOString(),
        }
      });
    }

    // 2. DB에 없으면 네이버 API 직접 호출
    try {
      const naverApiUrl = `https://new.land.naver.com/api/complexes/${complexNo}`;
      console.log('[complex-info] Fetching from Naver API:', naverApiUrl);

      const naverResponse = await fetch(naverApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://new.land.naver.com/',
          'Accept': 'application/json',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      });

      console.log('[complex-info] Naver API response status:', naverResponse.status);

      if (!naverResponse.ok) {
        const errorText = await naverResponse.text();
        console.error('[complex-info] Naver API error:', errorText);
        return NextResponse.json(
          { error: `단지 정보를 찾을 수 없습니다. (HTTP ${naverResponse.status})\n\n단지번호를 확인해주세요.` },
          { status: 404 }
        );
      }

      const naverData = await naverResponse.json();
      console.log('[complex-info] Naver API response keys:', Object.keys(naverData));

      const complexDetail = naverData.complexDetail;

      if (!complexDetail) {
        console.error('[complex-info] No complexDetail in response:', JSON.stringify(naverData).substring(0, 500));
        return NextResponse.json(
          { error: '단지 정보가 없습니다. 올바른 단지번호인지 확인해주세요.' },
          { status: 404 }
        );
      }

      console.log('[complex-info] Successfully fetched:', complexDetail.complexName);

      return NextResponse.json({
        success: true,
        source: 'naver',
        complex: {
          complexNo,
          complexName: complexDetail.complexName,
          totalHousehold: complexDetail.totalHouseholdCount,
          totalDong: complexDetail.totalDongCount,
          address: complexDetail.address,
          roadAddress: complexDetail.roadAddress,
          articleCount: 0, // 아직 크롤링 안 함
          lastCrawledAt: null,
        }
      });

    } catch (error: any) {
      console.error('[complex-info] Failed to fetch from Naver API:', error);
      return NextResponse.json(
        { error: `단지 정보를 가져오는데 실패했습니다.\n\n오류: ${error.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Complex info fetch error:', error);
    return NextResponse.json(
      { error: '단지 정보 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
