import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const complexNo = searchParams.get('complexNo');
    const tradeType = searchParams.get('tradeType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minArea = searchParams.get('minArea');
    const maxArea = searchParams.get('maxArea');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // WHERE 조건 구성
    const where: any = {};

    if (complexNo) {
      where.complex = {
        complexNo: complexNo,
      };
    }

    if (tradeType) {
      where.tradeTypeName = tradeType;
    }

    if (minArea || maxArea) {
      where.area1 = {};
      if (minArea) where.area1.gte = parseFloat(minArea);
      if (maxArea) where.area1.lte = parseFloat(maxArea);
    }

    // 가격 필터링 (문자열이므로 복잡함 - 일단 간단하게)
    // TODO: 향후 dealOrWarrantPrc를 숫자로 변환하여 저장하는 것 고려

    // 매물 조회
    const articles = await prisma.article.findMany({
      where,
      include: {
        complex: true, // 단지 정보 포함
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 총 개수
    const total = await prisma.article.count({ where });

    // 단지별로 그룹화
    const complexMap = new Map();

    for (const article of articles) {
      const complexNo = article.complex.complexNo;

      if (!complexMap.has(complexNo)) {
        complexMap.set(complexNo, {
          overview: {
            complexNo: article.complex.complexNo,
            complexName: article.complex.complexName,
            totalHousehold: article.complex.totalHousehold,
            totalDong: article.complex.totalDong,
            location: {
              latitude: article.complex.latitude,
              longitude: article.complex.longitude,
            },
            address: article.complex.address,
            roadAddress: article.complex.roadAddress,
            jibunAddress: article.complex.jibunAddress,
            beopjungdong: article.complex.beopjungdong,
            haengjeongdong: article.complex.haengjeongdong,
          },
          articles: [],
        });
      }

      complexMap.get(complexNo).articles.push({
        articleNo: article.articleNo,
        realEstateTypeName: article.realEstateTypeName,
        tradeTypeName: article.tradeTypeName,
        dealOrWarrantPrc: article.dealOrWarrantPrc,
        rentPrc: article.rentPrc,
        area1: article.area1.toString(),
        area2: article.area2?.toString(),
        floorInfo: article.floorInfo,
        direction: article.direction,
        articleConfirmYmd: article.articleConfirmYmd,
        buildingName: article.buildingName,
        sameAddrCnt: article.sameAddrCnt,
        realtorName: article.realtorName,
        articleFeatureDesc: article.articleFeatureDesc,
        tagList: article.tagList,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
      });
    }

    const results = Array.from(complexMap.values());

    return NextResponse.json({
      results,
      total,
      limit,
      offset,
      complexCount: results.length,
    });

  } catch (error: any) {
    console.error('Results fetch error:', error);
    return NextResponse.json(
      { error: '결과 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

// 매물 삭제 (개별)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleNo = searchParams.get('articleNo');
    const complexNo = searchParams.get('complexNo');

    if (articleNo) {
      // 특정 매물 삭제
      await prisma.article.delete({
        where: { articleNo },
      });

      return NextResponse.json({
        success: true,
        message: '매물이 삭제되었습니다.',
        articleNo,
      });
    } else if (complexNo) {
      // 특정 단지의 모든 매물 삭제
      const complex = await prisma.complex.findUnique({
        where: { complexNo },
      });

      if (!complex) {
        return NextResponse.json(
          { error: '단지를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const result = await prisma.article.deleteMany({
        where: { complexId: complex.id },
      });

      return NextResponse.json({
        success: true,
        message: `${result.count}개의 매물이 삭제되었습니다.`,
        complexNo,
        deletedCount: result.count,
      });
    } else {
      return NextResponse.json(
        { error: 'articleNo 또는 complexNo를 제공해주세요.' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
