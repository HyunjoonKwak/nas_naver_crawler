/**
 * 간단한 인메모리 캐시
 * 프로덕션에서는 Redis 등 외부 캐시 사용 권장
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * 캐시에서 데이터 조회
   * 만료된 경우 자동 삭제
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // 만료 체크
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * 캐시 삭제
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 캐시 크기 반환
   */
  size(): number {
    return this.store.size;
  }

  /**
   * 만료된 항목 정리
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * 전역 캐시 인스턴스
 */
export const cache = new Cache();

/**
 * 캐시와 함께 데이터 페칭
 * 캐시 미스 시 fetcher 실행하여 결과 저장
 *
 * @example
 * ```ts
 * const stats = await getCached(
 *   'db-stats',
 *   60000, // 1분 캐시
 *   () => prisma.complex.count()
 * );
 * ```
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 캐시 조회
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 캐시 미스 - fetcher 실행
  const data = await fetcher();
  cache.set(key, data, ttl);

  return data;
}

/**
 * 캐시 무효화 헬퍼
 */
export function invalidateCache(pattern: string | RegExp): number {
  let removed = 0;

  for (const key of cache['store'].keys()) {
    if (typeof pattern === 'string') {
      if (key.startsWith(pattern)) {
        cache.delete(key);
        removed++;
      }
    } else {
      if (pattern.test(key)) {
        cache.delete(key);
        removed++;
      }
    }
  }

  return removed;
}

/**
 * 캐시 TTL 프리셋
 */
export const cacheTTL = {
  short: 1 * 60 * 1000,      // 1분
  medium: 5 * 60 * 1000,     // 5분
  long: 30 * 60 * 1000,      // 30분
  day: 24 * 60 * 60 * 1000,  // 1일
};

// 10분마다 만료된 캐시 정리
setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) {
    console.log(`[Cache] Cleaned up ${removed} expired entries`);
  }
}, 10 * 60 * 1000);

/**
 * 사용 예시:
 *
 * ```ts
 * import { getCached, cache, invalidateCache, cacheTTL } from '@/lib/cache';
 *
 * // 캐시와 함께 데이터 조회
 * const stats = await getCached(
 *   'db-stats',
 *   cacheTTL.medium,
 *   async () => {
 *     return await prisma.complex.count();
 *   }
 * );
 *
 * // 직접 캐시 조작
 * cache.set('user:123', userData, cacheTTL.long);
 * const user = cache.get('user:123');
 *
 * // 캐시 무효화
 * invalidateCache('user:'); // user:로 시작하는 모든 키 삭제
 * invalidateCache(/^complex/); // complex로 시작하는 모든 키 삭제
 * ```
 */
