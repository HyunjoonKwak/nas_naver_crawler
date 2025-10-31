/**
 * 단지 정보 처리 서비스
 *
 * 책임:
 * - 크롤링 데이터를 단지 upsert 데이터로 변환
 * - 역지오코딩 (좌표 → 주소)
 * - 기존 DB 데이터와 병합
 */

import { createLogger } from '@/lib/logger';
import { complexRepository } from '@/repositories';

const logger = createLogger('COMPLEX_PROCESSOR');

export interface ComplexUpsertData {
  complexNo: string;
  complexName: string;
  totalHousehold: number | null;
  totalDong: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  roadAddress: string | null;
  jibunAddress: string | null;
  beopjungdong: string | null;
  haengjeongdong: string | null;
  sidoCode: string | null;
  sigunguCode: string | null;
  dongCode: string | null;
  lawdCd: string | null;
  pyeongs: any[];
  userId: string;
}

/**
 * 크롤링 데이터를 단지 upsert 데이터로 변환합니다.
 *
 * @param crawlData - 크롤링 데이터 배열
 * @param userId - 사용자 ID
 * @returns 단지 upsert 데이터 배열
 */
export function prepareComplexUpsertData(
  crawlData: any[],
  userId: string
): ComplexUpsertData[] {
  const complexes: ComplexUpsertData[] = [];

  for (const data of crawlData) {
    const overview = data.overview;
    const articleList = data.articles?.articleList || [];

    // complexNo 추출 (overview 우선, 없으면 crawling_info)
    const complexNo = overview?.complexNo || data.crawling_info?.complex_no;

    if (!complexNo) {
      logger.warn('Skipping data without complexNo', { data });
      continue;
    }

    // 위치 정보 추출 (overview 우선, 없으면 첫 번째 매물)
    const firstArticle = articleList[0];
    const latitude =
      overview?.location?.latitude ||
      overview?.latitude ||
      (firstArticle?.latitude ? parseFloat(firstArticle.latitude) : null);
    const longitude =
      overview?.location?.longitude ||
      overview?.longitude ||
      (firstArticle?.longitude ? parseFloat(firstArticle.longitude) : null);

    complexes.push({
      complexNo,
      complexName: overview?.complexName || `단지 ${complexNo}`,
      totalHousehold:
        overview?.totalHouseHoldCount || overview?.totalHousehold || null,
      totalDong: overview?.totalDongCount || overview?.totalDong || null,
      latitude,
      longitude,
      address: overview?.address || null,
      roadAddress: overview?.roadAddress || null,
      jibunAddress: overview?.jibunAddress || null,
      beopjungdong: overview?.beopjungdong || null,
      haengjeongdong: overview?.haengjeongdong || null,
      sidoCode: null,
      sigunguCode: null,
      dongCode: null,
      lawdCd: null,
      pyeongs: overview?.pyeongs || [],
      userId,
    });
  }

  logger.info('Prepared complex upsert data', {
    totalCount: complexes.length,
  });

  return complexes;
}

/**
 * DB에서 기존 단지의 법정동 정보를 가져와 병합합니다.
 *
 * @param complexes - 단지 데이터 배열
 * @returns 병합된 단지 데이터 (in-place 수정)
 */
export async function mergeExistingGeoData(
  complexes: ComplexUpsertData[]
): Promise<number> {
  const complexNos = complexes.map(c => c.complexNo);

  // DB에서 기존 단지의 지오코딩 정보 조회 (repository 사용)
  const existingComplexes = await complexRepository.getExistingGeoData(complexNos);

  // Map으로 빠른 조회
  const existingDataMap = new Map(
    existingComplexes.map(c => [c.complexNo, c])
  );

  // 기존 법정동 정보 병합
  let mergedCount = 0;

  for (const complex of complexes) {
    const existing = existingDataMap.get(complex.complexNo);

    if (existing && existing.beopjungdong) {
      // DB에 법정동 정보가 있으면 사용 (기존 데이터 우선)
      complex.beopjungdong = complex.beopjungdong || existing.beopjungdong;
      complex.haengjeongdong =
        complex.haengjeongdong || existing.haengjeongdong;
      complex.sidoCode = complex.sidoCode || existing.sidoCode;
      complex.sigunguCode = complex.sigunguCode || existing.sigunguCode;
      complex.dongCode = complex.dongCode || existing.dongCode;
      complex.lawdCd = complex.lawdCd || existing.lawdCd;

      mergedCount++;

      logger.debug('Merged existing geo data', {
        complexNo: complex.complexNo,
        complexName: complex.complexName,
      });
    }
  }

  logger.info('Merged existing geo data', {
    totalComplexes: complexes.length,
    mergedCount,
    skippedGeocoding: mergedCount,
  });

  return mergedCount;
}

/**
 * 좌표가 있지만 법정동 정보가 없는 단지에 대해 역지오코딩을 수행합니다.
 *
 * @param complexes - 단지 데이터 배열
 * @returns 역지오코딩이 필요한 단지 수
 */
export async function enrichWithGeocode(
  complexes: ComplexUpsertData[]
): Promise<number> {
  // 좌표는 있지만 법정동 정보가 없는 단지만 필터링
  const needsGeocoding = complexes.filter(
    c =>
      (c.latitude !== null && c.longitude !== null) &&
      !c.beopjungdong
  );

  if (needsGeocoding.length === 0) {
    logger.info('No complexes need geocoding');
    return 0;
  }

  logger.info('Starting reverse geocoding', {
    totalCount: needsGeocoding.length,
  });

  let geocodedCount = 0;

  for (const complex of needsGeocoding) {
    try {
      // 역지오코딩 API 호출
      const response = await fetch(
        `/api/geocode?lat=${complex.latitude}&lng=${complex.longitude}`
      );

      if (response.ok) {
        const geoData = await response.json();

        if (geoData.beopjungdong) {
          complex.beopjungdong = geoData.beopjungdong;
          complex.haengjeongdong = geoData.haengjeongdong;
          complex.sidoCode = geoData.sidoCode;
          complex.sigunguCode = geoData.sigunguCode;
          complex.dongCode = geoData.dongCode;
          complex.lawdCd = geoData.lawdCd;

          geocodedCount++;

          logger.debug('Reverse geocoded successfully', {
            complexNo: complex.complexNo,
            complexName: complex.complexName,
            beopjungdong: geoData.beopjungdong,
          });
        }
      }
    } catch (error: any) {
      logger.warn('Reverse geocoding failed', {
        complexNo: complex.complexNo,
        error: error.message,
      });
    }
  }

  logger.info('Reverse geocoding completed', {
    needsGeocoding: needsGeocoding.length,
    geocodedCount,
    failedCount: needsGeocoding.length - geocodedCount,
  });

  return geocodedCount;
}

/**
 * 단지 정보를 DB에 upsert합니다.
 *
 * @param complexes - 단지 데이터 배열
 * @returns upsert된 단지 ID 맵 (complexNo -> id)
 */
export async function upsertComplexes(
  complexes: ComplexUpsertData[]
): Promise<Map<string, string>> {
  logger.info('Starting complex upsert', {
    totalCount: complexes.length,
  });

  // ComplexUpsertData를 Prisma.ComplexCreateInput으로 변환
  const complexCreateInputs = complexes.map(c => ({
    ...c,
    pyeongs: c.pyeongs as any, // JSON 타입
  })) as any;

  // repository의 upsertMany 사용
  const upsertedComplexes = await complexRepository.upsertMany(complexCreateInputs);

  // complexNo -> id 매핑 생성
  const complexNoToIdMap = new Map<string, string>(
    upsertedComplexes.map(c => [c.complexNo, c.id])
  );

  logger.info('Complex upsert completed', {
    totalCount: complexes.length,
    upsertedCount: complexNoToIdMap.size,
  });

  return complexNoToIdMap;
}
