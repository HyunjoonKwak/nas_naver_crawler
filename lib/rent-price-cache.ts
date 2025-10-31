/**
 * 전월세 실거래가 캐싱 레이어
 *
 * 이 파일은 하위 호환성을 위해 유지되며, db-cache.ts의 래퍼입니다.
 */

import {
  getDbCache,
  setDbCache,
  invalidateDbCache,
  cleanExpiredDbCache,
  getDbCacheStats,
} from './db-cache';
import type { ProcessedRentPrice } from './rent-price-api';

/**
 * 캐시 조회 (만료되지 않은 캐시만 반환)
 */
export async function getRentPriceCache(
  lawdCd: string,
  dealYmd: string
): Promise<ProcessedRentPrice[] | null> {
  return getDbCache<ProcessedRentPrice[]>('rentPrice', lawdCd, dealYmd);
}

/**
 * 캐시 저장 (upsert)
 */
export async function setRentPriceCache(
  lawdCd: string,
  dealYmd: string,
  data: ProcessedRentPrice[]
): Promise<void> {
  return setDbCache('rentPrice', lawdCd, dealYmd, data);
}

/**
 * 특정 캐시 무효화
 */
export async function invalidateRentPriceCache(
  lawdCd: string,
  dealYmd: string
): Promise<void> {
  return invalidateDbCache('rentPrice', lawdCd, dealYmd);
}

/**
 * 만료된 캐시 정리 (크론잡에서 호출)
 */
export async function cleanExpiredRentPriceCache(): Promise<number> {
  return cleanExpiredDbCache('rentPrice');
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
  return getDbCacheStats('rentPrice');
}
