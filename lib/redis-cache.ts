/**
 * Redis 기반 캐싱 레이어
 * 다층 캐싱 전략: L1 (Memory) + L2 (Redis)
 */

import { createClient, RedisClientType } from 'redis';

// Redis 클라이언트 (싱글톤)
let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Redis 클라이언트 초기화
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Redis reconnect limit exceeded');
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      console.log('[Redis] Disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error: any) {
    console.error('[Redis] Connection failed:', error);
    return null;
  }
}

/**
 * 캐시 키 프리픽스
 */
export const CacheKeys = {
  complex: {
    detail: (complexId: string) => `complex:${complexId}`,
    priceStats: (complexId: string) => `complex:${complexId}:price_stats`,
    list: (userId: string, params: string) => `complex:list:${userId}:${params}`,
  },
  article: {
    list: (complexId: string, page: number) => `article:list:${complexId}:${page}`,
    byComplex: (complexId: string) => `article:complex:${complexId}:*`,
  },
  analytics: {
    dashboard: (userId: string) => `analytics:dashboard:${userId}`,
    priceTrend: (complexNo: string, days: number) => `analytics:price_trend:${complexNo}:${days}d`,
  },
  user: {
    favorites: (userId: string) => `user:${userId}:favorites`,
  },
};

/**
 * 캐시 TTL (초)
 */
export const CacheTTL = {
  short: 60,           // 1분 (자주 변하는 데이터)
  medium: 300,         // 5분 (일반 데이터)
  long: 1800,          // 30분 (잘 안 변하는 데이터)
  veryLong: 86400,     // 1일 (거의 안 변하는 데이터)
};

/**
 * 캐시에서 데이터 조회
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const cached = await client.get(key);
    if (!cached) return null;

    return JSON.parse(cached) as T;
  } catch (error: any) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

/**
 * 캐시에 데이터 저장
 */
export async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (error: any) {
    console.error('[Cache] Set error:', error);
  }
}

/**
 * 캐시 삭제 (패턴 지원)
 */
export async function deleteCache(pattern: string): Promise<number> {
  try {
    const client = await getRedisClient();
    if (!client) return 0;

    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    await client.del(keys);
    return keys.length;
  } catch (error: any) {
    console.error('[Cache] Delete error:', error);
    return 0;
  }
}

/**
 * 캐시와 함께 데이터 페칭 (Cache-Aside 패턴)
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. 캐시 조회
  const cached = await getCache<T>(key);
  if (cached !== null) {
    console.log('[Cache] HIT:', key);
    return cached;
  }

  console.log('[Cache] MISS:', key);

  // 2. 캐시 미스 - DB 조회
  const data = await fetcher();

  // 3. 캐시 저장
  await setCache(key, data, ttl);

  return data;
}

/**
 * 다층 캐싱 전략 클래스
 */
class MultiLayerCache {
  private memoryCache: Map<string, { data: any; expiresAt: number }> = new Map();

  /**
   * L1 (메모리) + L2 (Redis) 캐싱
   */
  async get<T>(key: string): Promise<T | null> {
    // L1: 메모리 캐시 (초고속)
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expiresAt > Date.now()) {
      console.log('[Cache] L1 HIT:', key);
      return memCached.data as T;
    }

    // L2: Redis 캐시 (빠름)
    const redisCached = await getCache<T>(key);
    if (redisCached) {
      console.log('[Cache] L2 HIT:', key);
      
      // L1에도 저장 (Write-through)
      this.memoryCache.set(key, {
        data: redisCached,
        expiresAt: Date.now() + 60000, // 1분
      });
      
      return redisCached;
    }

    console.log('[Cache] MISS:', key);
    return null;
  }

  /**
   * L1 & L2 동시 저장
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // L1: 메모리 (최대 5분)
    this.memoryCache.set(key, {
      data: value,
      expiresAt: Date.now() + Math.min(ttl * 1000, 300000),
    });

    // L2: Redis
    await setCache(key, value, ttl);
  }

  /**
   * L1 & L2 동시 삭제
   */
  async delete(pattern: string): Promise<void> {
    // L1: 메모리 캐시 패턴 매칭
    for (const [key] of this.memoryCache.entries()) {
      if (key.includes(pattern) || key.startsWith(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // L2: Redis
    await deleteCache(pattern);
  }

  /**
   * 만료된 메모리 캐시 정리
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// 싱글톤 인스턴스
export const multiLayerCache = new MultiLayerCache();

// 10분마다 메모리 캐시 정리
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    multiLayerCache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * 사용 예시:
 * 
 * ```typescript
 * import { getCached, CacheKeys, CacheTTL } from '@/lib/redis-cache';
 * 
 * // 단순 캐싱
 * const complexes = await getCached(
 *   CacheKeys.complex.list(userId, searchParams.toString()),
 *   CacheTTL.medium,
 *   async () => {
 *     return await prisma.complex.findMany({ ... });
 *   }
 * );
 * 
 * // 다층 캐싱
 * const data = await multiLayerCache.get('key') || 
 *   await fetchData();
 * await multiLayerCache.set('key', data, 300);
 * 
 * // 캐시 무효화
 * await multiLayerCache.delete('complex:*');
 * ```
 */

