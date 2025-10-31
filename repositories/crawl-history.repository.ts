/**
 * CrawlHistory Repository
 *
 * 크롤링 히스토리 관련 데이터 접근 로직
 */

import { CrawlHistory, Prisma } from '@prisma/client';
import { BaseRepository } from './base-repository';
import { prisma } from '@/lib/prisma';

export class CrawlHistoryRepository extends BaseRepository<CrawlHistory> {
  constructor() {
    super(prisma);
  }

  getModelName() {
    return 'crawlHistory';
  }

  /**
   * 최근 크롤링 히스토리 조회
   */
  async findRecent(limit = 10, userId?: string) {
    const where: Prisma.CrawlHistoryWhereInput = userId ? { userId } : {};

    return this.prisma.crawlHistory.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * 성공/실패 통계
   */
  async getStats(userId?: string) {
    const where: Prisma.CrawlHistoryWhereInput = userId ? { userId } : {};

    const [total, success, failed, partial] = await Promise.all([
      this.prisma.crawlHistory.count({ where }),
      this.prisma.crawlHistory.count({ where: { ...where, status: 'success' } }),
      this.prisma.crawlHistory.count({ where: { ...where, status: 'failed' } }),
      this.prisma.crawlHistory.count({ where: { ...where, status: 'partial' } }),
    ]);

    return { total, success, failed, partial };
  }

  /**
   * 진행 중인 크롤링 조회
   */
  async findInProgress() {
    return this.prisma.crawlHistory.findMany({
      where: {
        status: { in: ['pending', 'crawling', 'saving'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 특정 기간의 크롤링 히스토리 조회
   */
  async findByDateRange(startDate: Date, endDate: Date, userId?: string) {
    const where: Prisma.CrawlHistoryWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.crawlHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * 스케줄 ID로 크롤링 히스토리 조회
   */
  async findByScheduleId(scheduleId: string, limit = 10) {
    return this.prisma.crawlHistory.findMany({
      where: { scheduleId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 평균 크롤링 시간 계산
   */
  async getAverageDuration(userId?: string): Promise<number> {
    const where: Prisma.CrawlHistoryWhereInput = {
      status: 'success',
      duration: { gt: 0 },
    };

    if (userId) {
      where.userId = userId;
    }

    const result = await this.prisma.crawlHistory.aggregate({
      where,
      _avg: { duration: true },
    });

    return result._avg.duration || 0;
  }

  /**
   * 총 수집된 매물 수 집계
   */
  async getTotalArticlesCollected(userId?: string): Promise<number> {
    const where: Prisma.CrawlHistoryWhereInput = userId ? { userId } : {};

    const result = await this.prisma.crawlHistory.aggregate({
      where,
      _sum: { totalArticles: true },
    });

    return result._sum.totalArticles || 0;
  }

  /**
   * 실패한 크롤링만 조회
   */
  async findFailed(limit = 20, userId?: string) {
    const where: Prisma.CrawlHistoryWhereInput = {
      status: 'failed',
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.crawlHistory.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}

// Singleton export
export const crawlHistoryRepository = new CrawlHistoryRepository();
