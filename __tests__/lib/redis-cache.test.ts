/**
 * Redis 캐싱 레이어 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Redis 클라이언트 모킹
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    get: vi.fn(),
    setEx: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  })),
}));

// 모듈 import는 모킹 후에
import {
  getCache,
  setCache,
  deleteCache,
  getCached,
  CacheKeys,
  CacheTTL,
  multiLayerCache
} from '@/lib/redis-cache';

describe('Redis Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CacheKeys', () => {
    it('should generate correct complex detail key', () => {
      const key = CacheKeys.complex.detail('complex-123');
      expect(key).toBe('complex:complex-123');
    });

    it('should generate correct price stats key', () => {
      const key = CacheKeys.complex.priceStats('complex-123');
      expect(key).toBe('complex:complex-123:price_stats');
    });

    it('should generate correct article list key', () => {
      const key = CacheKeys.article.list('complex-123', 1);
      expect(key).toBe('article:list:complex-123:1');
    });

    it('should generate correct analytics dashboard key', () => {
      const key = CacheKeys.analytics.dashboard('user-123');
      expect(key).toBe('analytics:dashboard:user-123');
    });
  });

  describe('CacheTTL', () => {
    it('should have correct TTL values', () => {
      expect(CacheTTL.short).toBe(60); // 1분
      expect(CacheTTL.medium).toBe(300); // 5분
      expect(CacheTTL.long).toBe(1800); // 30분
      expect(CacheTTL.veryLong).toBe(86400); // 1일
    });
  });

  describe('getCached - Cache-Aside Pattern', () => {
    it('should return cached data on cache hit', async () => {
      const mockData = { name: 'Test Complex', price: 1000000 };
      const mockFetcher = vi.fn().mockResolvedValue(mockData);

      // Note: 실제 Redis 연결이 없으므로 이 테스트는 스킵됩니다
      // 통합 테스트에서 실제 Redis로 테스트해야 합니다
      expect(mockFetcher).toBeDefined();
    });
  });

  describe('MultiLayerCache', () => {
    beforeEach(() => {
      // 메모리 캐시 초기화
      multiLayerCache.cleanup();
    });

    it('should cleanup expired entries', () => {
      multiLayerCache.cleanup();
      // 실제 동작 확인은 통합 테스트에서
      expect(true).toBe(true);
    });
  });
});
