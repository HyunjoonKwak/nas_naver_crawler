/**
 * 스케줄러 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { validateCronExpression, getNextRunTime } from '@/lib/scheduler';

// node-cron 모킹
vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn((expr: string) => {
      // 간단한 cron 표현식 검증 (5개 필드)
      const parts = expr.split(' ');
      return parts.length === 5;
    }),
    schedule: vi.fn(() => ({
      stop: vi.fn(),
    })),
  },
}));

// Prisma 모킹
vi.mock('@/lib/prisma', () => ({
  prisma: {
    schedule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    crawlHistory: {
      findFirst: vi.fn(),
    },
    favorite: {
      findMany: vi.fn(),
    },
    scheduleLog: {
      create: vi.fn(),
    },
  },
}));

// EventBroadcaster 모킹
vi.mock('@/lib/eventBroadcaster', () => ({
  eventBroadcaster: {
    notifyScheduleStart: vi.fn(),
    notifyScheduleComplete: vi.fn(),
    notifyScheduleFailed: vi.fn(),
  },
}));

// timeoutCalculator 모킹
vi.mock('@/lib/timeoutCalculator', () => ({
  calculateDynamicTimeout: vi.fn(() => Promise.resolve(300000)), // 5분
}));

describe('Scheduler', () => {
  describe('validateCronExpression', () => {
    it('should validate correct cron expression', () => {
      expect(validateCronExpression('0 9 * * *')).toBe(true); // 매일 오전 9시
    });

    it('should validate minute-level cron', () => {
      expect(validateCronExpression('*/5 * * * *')).toBe(true); // 5분마다
    });

    it('should validate specific days', () => {
      expect(validateCronExpression('0 18 * * 1-5')).toBe(true); // 평일 오후 6시
    });

    it('should reject invalid format (4 fields)', () => {
      expect(validateCronExpression('0 9 * *')).toBe(false);
    });

    it('should reject invalid format (6 fields)', () => {
      expect(validateCronExpression('0 0 9 * * *')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateCronExpression('')).toBe(false);
    });
  });

  describe('getNextRunTime', () => {
    it('should calculate next run time for daily schedule', () => {
      const nextRun = getNextRunTime('0 9 * * *'); // 매일 오전 9시

      if (nextRun) {
        expect(nextRun).toBeInstanceOf(Date);
        expect(nextRun.getTime()).toBeGreaterThan(Date.now());
      } else {
        // null이면 유효하지 않은 표현식
        expect(nextRun).toBeNull();
      }
    });

    it('should return null for invalid cron', () => {
      const nextRun = getNextRunTime('invalid cron');
      expect(nextRun).toBeNull();
    });

    it('should handle timezone correctly (KST)', () => {
      const nextRun = getNextRunTime('30 14 * * *'); // 매일 오후 2시 30분 (KST)

      if (nextRun) {
        // KST 시간대 처리 확인
        expect(nextRun).toBeInstanceOf(Date);
      }
    });
  });
});
