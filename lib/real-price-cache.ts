/**
 * 실거래가 캐싱 레이어
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
import type { ProcessedRealPrice } from './real-price-api';

/**
 * 캐시 조회 (만료되지 않은 캐시만 반환)
 */
export async function getRealPriceCache(
  lawdCd: string,
  dealYmd: string
): Promise<ProcessedRealPrice[] | null> {
  return getDbCache<ProcessedRealPrice[]>('realPrice', lawdCd, dealYmd);
}

/**
 * 캐시 저장 (upsert)
 */
export async function setRealPriceCache(
  lawdCd: string,
  dealYmd: string,
  data: ProcessedRealPrice[]
): Promise<void> {
  return setDbCache('realPrice', lawdCd, dealYmd, data);
}

/**
 * 특정 캐시 무효화
 */
export async function invalidateRealPriceCache(
  lawdCd: string,
  dealYmd: string
): Promise<void> {
  return invalidateDbCache('realPrice', lawdCd, dealYmd);
}

/**
 * 만료된 캐시 정리 (크론잡에서 호출)
 */
export async function cleanExpiredRealPriceCache(): Promise<number> {
  return cleanExpiredDbCache('realPrice');
}

/**
 * 캐시 통계 조회 (모니터링용)
 */
export async function getRealPriceCacheStats(): Promise<{
  totalEntries: number;
  totalItems: number;
  oldestCache: Date | null;
  newestCache: Date | null;
  expiredCount: number;
}> {
  return getDbCacheStats('realPrice');
}
