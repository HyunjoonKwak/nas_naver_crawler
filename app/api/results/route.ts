import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getComplexWhereCondition } from '@/lib/auth-utils';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// CSV 파일에서 단지 정보 읽기
async function readCSVComplexInfo(): Promise<Map<string, any>> {
  const complexInfoMap = new Map();

  try {
    const baseDir = process.cwd();
    const crawledDataDir = path.join(baseDir, 'crawled_data');

    const files = await fs.readdir(crawledDataDir);
    const csvFiles = files
      .filter(f => f.endsWith('.csv') && f.startsWith('complexes_'))
      .sort()
      .reverse(); // 최신 파일 우선

    if (csvFiles.length === 0) {
      return complexInfoMap;
    }

    // 최신 CSV 파일 읽기
    const latestCsvPath = path.join(crawledDataDir, csvFiles[0]);
    const csvContent = await fs.readFile(latestCsvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return complexInfoMap;
    }

    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      const complexNo = row['단지번호'];
      if (complexNo) {
        complexInfoMap.set(complexNo, {
          complexName: row['단지명'],
          totalHouseHoldCount: parseInt(row['세대수']) || null,
          totalDongCount: parseInt(row['동수']) || null,
          minArea: parseFloat(row['최소면적']) || null,
          maxArea: parseFloat(row['최대면적']) || null,
          minPrice: parseInt(row['최소가격']) || null,
          maxPrice: parseInt(row['최대가격']) || null,
          useApproveYmd: row['사용승인일'] || null,
          latitude: parseFloat(row['위도']) || null,
          longitude: parseFloat(row['경도']) || null,
          roadAddress: row['도로명주소'] || null,
          jibunAddress: row['지번주소'] || null,
          address: row['주소'] || null,
        });
      }
    }
  } catch (error) {
    console.log('CSV 읽기 실패 (무시):', error);
  }

  return complexInfoMap;
}

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const currentUser = await requireAuth();

    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터
    const complexNo = searchParams.get('complexNo');
    const tradeType = searchParams.get('tradeType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minArea = searchParams.get('minArea');
    const maxArea = searchParams.get('maxArea');
    const limit = parseInt(searchParams.get('limit') || '10000'); // 충분히 큰 기본값으로 변경
    const offset = parseInt(searchParams.get('offset') || '0');

    // 사용자 기반 Complex 필터링 조건 가져오기
    const userComplexFilter = await getComplexWhereCondition(currentUser);

    // WHERE 조건 구성
    const where: any = {
      complex: {
        ...userComplexFilter, // 사용자 필터링 추가
      }
    };

    if (complexNo) {
      where.complex.complexNo = complexNo;
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

    // CSV에서 단지 정보 읽기
    const csvComplexInfo = await readCSVComplexInfo();

    // 단지별로 그룹화
    const complexMap = new Map();

    for (const article of articles) {
      const complexNo = article.complex.complexNo;

      if (!complexMap.has(complexNo)) {
        // CSV 정보 가져오기
        const csvInfo = csvComplexInfo.get(complexNo);

        complexMap.set(complexNo, {
          overview: {
            complexNo: article.complex.complexNo,
            complexName: article.complex.complexName,
            totalHousehold: article.complex.totalHousehold || csvInfo?.totalHouseHoldCount,
            totalDong: article.complex.totalDong || csvInfo?.totalDongCount,
            location: {
              latitude: article.complex.latitude || csvInfo?.latitude,
              longitude: article.complex.longitude || csvInfo?.longitude,
            },
            address: article.complex.address || csvInfo?.address,
            roadAddress: article.complex.roadAddress || csvInfo?.roadAddress,
            jibunAddress: article.complex.jibunAddress || csvInfo?.jibunAddress,
            beopjungdong: article.complex.beopjungdong,
            haengjeongdong: article.complex.haengjeongdong,
            pyeongs: article.complex.pyeongs,
            useApproveYmd: csvInfo?.useApproveYmd,
            // CSV에서 가져온 추가 정보
            minArea: csvInfo?.minArea,
            maxArea: csvInfo?.maxArea,
            minPrice: csvInfo?.minPrice,
            maxPrice: csvInfo?.maxPrice,
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
