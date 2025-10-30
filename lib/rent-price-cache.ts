/**
 * 전월세 실거래가 캐싱 레이어
 *
 * 설계 원칙:
 * - Prisma 의존성을 이 파일에만 격리 (rent-price-api.ts는 순수 API 클라이언트 유지)
 * - 지역 단위 캐싱 (lawdCd + dealYmd)
 * - 캐시 실패 시 서비스 중단 없이 API 폴백
 * - 비동기 캐시 저장으로 응답 지연 방지
 */

import { prisma } from './prisma';
import type { ProcessedRentPrice } from './rent-price-api';

const CACHE_TTL_DAYS = 30;

/**
 * 캐시 조회 (만료되지 않은 캐시만 반환)
 *
 * @param lawdCd 법정동코드 (5자리)
 * @param dealYmd 거래년월 (YYYYMM)
 * @returns 캐시된 데이터 배열 또는 null (캐시 미스/만료)
 */
export async function getRentPriceCache(
  lawdCd: string,
  dealYmd: string
): Promise<ProcessedRentPrice[] | null> {
  try {
    const cache = await prisma.rentPriceCache.findUnique({
      where: {
        lawdCd_dealYmd: { lawdCd, dealYmd }
      },
    });

    if (!cache) {
      console.log(`[Rent Price Cache] MISS: ${lawdCd}-${dealYmd}`);
      return null;
    }

    // 만료 확인
    if (new Date() > cache.expiresAt) {
      console.log(`[Rent Price Cache] EXPIRED: ${lawdCd}-${dealYmd} (expired at ${cache.expiresAt.toISOString()})`);
      // 만료된 캐시 삭제 (비동기)
      prisma.rentPriceCache.delete({
        where: { lawdCd_dealYmd: { lawdCd, dealYmd } }
      }).catch(() => {});
      return null;
    }

    console.log(`[Rent Price Cache] HIT: ${lawdCd}-${dealYmd} (${cache.totalCount} items, cached ${Math.floor((Date.now() - cache.createdAt.getTime()) / 1000 / 60)} minutes ago)`);
    return cache.cachedData as ProcessedRentPrice[];
  } catch (error) {
    // 캐시 조회 실패는 치명적이지 않음 (API 폴백)
    console.error('[Rent Price Cache] Read error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * 캐시 저장 (upsert)
 *
 * @param lawdCd 법정동코드 (5자리)
 * @param dealYmd 거래년월 (YYYYMM)
 * @param data 전월세 실거래가 데이터 배열
 */
export async function setRentPriceCache(
  lawdCd: string,
  dealYmd: string,
  data: ProcessedRentPrice[]
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await prisma.rentPriceCache.upsert({
      where: {
        lawdCd_dealYmd: { lawdCd, dealYmd }
      },
      create: {
        lawdCd,
        dealYmd,
        cachedData: data as any,
        totalCount: data.length,
        expiresAt,
      },
      update: {
        cachedData: data as any,
        totalCount: data.length,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    console.log(`[Rent Price Cache] SET: ${lawdCd}-${dealYmd} (${data.length} items, TTL: ${CACHE_TTL_DAYS} days)`);
  } catch (error) {
    // 캐시 저장 실패는 로그만 남기고 서비스는 계속
    console.error('[Rent Price Cache] Write error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 특정 캐시 무효화
 *
 * @param lawdCd 법정동코드 (5자리)
 * @param dealYmd 거래년월 (YYYYMM)
 */
export async function invalidateRentPriceCache(
  lawdCd: string,
  dealYmd: string
): Promise<void> {
  try {
    await prisma.rentPriceCache.delete({
      where: {
        lawdCd_dealYmd: { lawdCd, dealYmd }
      },
    });
    console.log(`[Rent Price Cache] INVALIDATED: ${lawdCd}-${dealYmd}`);
  } catch (error) {
    // 캐시가 없을 수도 있음 (무시)
    console.error('[Rent Price Cache] Invalidation error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 만료된 캐시 정리 (크론잡에서 호출)
 *
 * @returns 삭제된 캐시 개수
 */
export async function cleanExpiredRentPriceCache(): Promise<number> {
  try {
    const result = await prisma.rentPriceCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      console.log(`[Rent Price Cache] Cleaned ${result.count} expired entries`);
    }

    return result.count;
  } catch (error) {
    console.error('[Rent Price Cache] Clean error:', error instanceof Error ? error.message : 'Unknown error');
    return 0;
  }
}

/**
 * 캐시 통계 조회 (모니터링용)
 */
export async function getRentPriceCacheStats(): Promise<{
  totalEntries: number;
  totalItems: number;
  oldestCache: Date | null;
  newestCache: Date | null;
  expiredCount: number;
}> {
  try {
    const [total, expiredCount, oldest, newest, itemsSum] = await Promise.all([
      prisma.rentPriceCache.count(),
      prisma.rentPriceCache.count({
        where: { expiresAt: { lt: new Date() } }
      }),
      prisma.rentPriceCache.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      }),
      prisma.rentPriceCache.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),
      prisma.rentPriceCache.aggregate({
        _sum: { totalCount: true }
      })
    ]);

    return {
      totalEntries: total,
      totalItems: itemsSum._sum.totalCount || 0,
      oldestCache: oldest?.createdAt || null,
      newestCache: newest?.createdAt || null,
      expiredCount,
    };
  } catch (error) {
    console.error('[Rent Price Cache] Stats error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      totalEntries: 0,
      totalItems: 0,
      oldestCache: null,
      newestCache: null,
      expiredCount: 0,
    };
  }
}
