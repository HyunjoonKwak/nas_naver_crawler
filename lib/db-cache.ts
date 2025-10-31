/**
 * 데이터베이스 기반 캐싱 유틸리티 (제네릭)
 *
 * 설계 원칙:
 * - Prisma 의존성을 이 파일에만 격리
 * - 지역 단위 캐싱 (lawdCd + dealYmd)
 * - 캐시 실패 시 서비스 중단 없이 폴백
 * - 비동기 캐시 저장으로 응답 지연 방지
 */

import { prisma } from './prisma';
import { createLogger } from './logger';
import type { ProcessedRealPrice } from './real-price-api';
import type { ProcessedRentPrice } from './rent-price-api';

const logger = createLogger('DB_CACHE');

const CACHE_TTL_DAYS = 30;

/**
 * 캐시 타입 (실거래가 또는 전월세)
 */
type CacheType = 'realPrice' | 'rentPrice';

/**
 * 캐시 데이터 타입
 */
type CacheData = ProcessedRealPrice[] | ProcessedRentPrice[];

/**
 * 캐시 조회 (만료되지 않은 캐시만 반환)
 *
 * @param cacheType 캐시 타입
 * @param lawdCd 법정동코드 (5자리)
 * @param dealYmd 거래년월 (YYYYMM)
 * @returns 캐시된 데이터 배열 또는 null (캐시 미스/만료)
 */
export async function getDbCache<T extends CacheData>(
  cacheType: CacheType,
  lawdCd: string,
  dealYmd: string
): Promise<T | null> {
  try {
    // TypeScript union type 이슈 회피를 위한 명시적 분기
    if (cacheType === 'realPrice') {
      const cache = await prisma.realPriceCache.findUnique({
        where: {
          lawdCd_dealYmd: { lawdCd, dealYmd }
        },
      });

      if (!cache) {
        logger.debug(`${getCacheLabel(cacheType)} MISS`, { lawdCd, dealYmd });
        return null;
      }

      // 만료 확인
      if (new Date() > cache.expiresAt) {
        logger.debug(`${getCacheLabel(cacheType)} EXPIRED`, {
          lawdCd,
          dealYmd,
          expiresAt: cache.expiresAt.toISOString()
        });
        // 만료된 캐시 삭제 (비동기)
        prisma.realPriceCache.delete({
          where: { lawdCd_dealYmd: { lawdCd, dealYmd } }
        }).catch(() => {});
        return null;
      }

      logger.debug(`${getCacheLabel(cacheType)} HIT`, {
        lawdCd,
        dealYmd,
        totalCount: cache.totalCount,
        cachedMinutesAgo: Math.floor((Date.now() - cache.createdAt.getTime()) / 1000 / 60)
      });
      return cache.cachedData as unknown as T;
    } else {
      const cache = await prisma.rentPriceCache.findUnique({
        where: {
          lawdCd_dealYmd: { lawdCd, dealYmd }
        },
      });

      if (!cache) {
        logger.debug(`${getCacheLabel(cacheType)} MISS`, { lawdCd, dealYmd });
        return null;
      }

      // 만료 확인
      if (new Date() > cache.expiresAt) {
        logger.debug(`${getCacheLabel(cacheType)} EXPIRED`, {
          lawdCd,
          dealYmd,
          expiresAt: cache.expiresAt.toISOString()
        });
        // 만료된 캐시 삭제 (비동기)
        prisma.rentPriceCache.delete({
          where: { lawdCd_dealYmd: { lawdCd, dealYmd } }
        }).catch(() => {});
        return null;
      }

      logger.debug(`${getCacheLabel(cacheType)} HIT`, {
        lawdCd,
        dealYmd,
        totalCount: cache.totalCount,
        cachedMinutesAgo: Math.floor((Date.now() - cache.createdAt.getTime()) / 1000 / 60)
      });
      return cache.cachedData as unknown as T;
    }
  } catch (error) {
    // 캐시 조회 실패는 치명적이지 않음 (API 폴백)
    logger.error(`${getCacheLabel(cacheType)} Read error`, {
      error,
      lawdCd,
      dealYmd
    });
    return null;
  }
}

/**
 * 캐시 저장 (upsert)
 *
 * @param cacheType 캐시 타입
 * @param lawdCd 법정동코드 (5자리)
 * @param dealYmd 거래년월 (YYYYMM)
 * @param data 데이터 배열
 */
export async function setDbCache<T extends CacheData>(
  cacheType: CacheType,
  lawdCd: string,
  dealYmd: string,
  data: T
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    if (cacheType === 'realPrice') {
      await prisma.realPriceCache.upsert({
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
    } else {
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
    }

    logger.info(`${getCacheLabel(cacheType)} SET`, {
      lawdCd,
      dealYmd,
      itemCount: data.length,
      ttlDays: CACHE_TTL_DAYS
    });
  } catch (error) {
    // 캐시 저장 실패는 로그만 남기고 서비스는 계속
    logger.error(`${getCacheLabel(cacheType)} Write error`, {
      error,
      lawdCd,
      dealYmd
    });
  }
}

/**
 * 특정 캐시 무효화
 *
 * @param cacheType 캐시 타입
 * @param lawdCd 법정동코드 (5자리)
 * @param dealYmd 거래년월 (YYYYMM)
 */
export async function invalidateDbCache(
  cacheType: CacheType,
  lawdCd: string,
  dealYmd: string
): Promise<void> {
  try {
    if (cacheType === 'realPrice') {
      await prisma.realPriceCache.delete({
        where: {
          lawdCd_dealYmd: { lawdCd, dealYmd }
        },
      });
    } else {
      await prisma.rentPriceCache.delete({
        where: {
          lawdCd_dealYmd: { lawdCd, dealYmd }
        },
      });
    }
    logger.info(`${getCacheLabel(cacheType)} INVALIDATED`, { lawdCd, dealYmd });
  } catch (error) {
    // 캐시가 없을 수도 있음 (무시)
    logger.warn(`${getCacheLabel(cacheType)} Invalidation error`, {
      error,
      lawdCd,
      dealYmd
    });
  }
}

/**
 * 만료된 캐시 정리 (크론잡에서 호출)
 *
 * @param cacheType 캐시 타입
 * @returns 삭제된 캐시 개수
 */
export async function cleanExpiredDbCache(cacheType: CacheType): Promise<number> {
  try {
    const result = cacheType === 'realPrice'
      ? await prisma.realPriceCache.deleteMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
        })
      : await prisma.rentPriceCache.deleteMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
        });

    if (result.count > 0) {
      logger.info(`${getCacheLabel(cacheType)} Cleaned expired entries`, {
        count: result.count
      });
    }

    return result.count;
  } catch (error) {
    logger.error(`${getCacheLabel(cacheType)} Clean error`, { error });
    return 0;
  }
}

/**
 * 캐시 통계 조회 (모니터링용)
 *
 * @param cacheType 캐시 타입
 */
export async function getDbCacheStats(cacheType: CacheType): Promise<{
  totalEntries: number;
  totalItems: number;
  oldestCache: Date | null;
  newestCache: Date | null;
  expiredCount: number;
}> {
  try {
    if (cacheType === 'realPrice') {
      const [total, expiredCount, oldest, newest, itemsSum] = await Promise.all([
        prisma.realPriceCache.count(),
        prisma.realPriceCache.count({
          where: { expiresAt: { lt: new Date() } }
        }),
        prisma.realPriceCache.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        }),
        prisma.realPriceCache.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        prisma.realPriceCache.aggregate({
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
    } else {
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
    }
  } catch (error) {
    logger.error(`${getCacheLabel(cacheType)} Stats error`, { error });
    return {
      totalEntries: 0,
      totalItems: 0,
      oldestCache: null,
      newestCache: null,
      expiredCount: 0,
    };
  }
}

/**
 * 캐시 타입에 따른 로그 레이블 반환
 */
function getCacheLabel(cacheType: CacheType): string {
  return cacheType === 'realPrice' ? 'Real Price Cache' : 'Rent Price Cache';
}
