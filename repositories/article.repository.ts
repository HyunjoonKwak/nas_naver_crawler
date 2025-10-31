/**
 * Article Repository
 *
 * 매물(Article) 관련 데이터 접근 로직
 */

import { Article, Prisma } from '@prisma/client';
import { BaseRepository } from './base-repository';
import { prisma } from '@/lib/prisma';

export class ArticleRepository extends BaseRepository<Article> {
  constructor() {
    super(prisma);
  }

  getModelName() {
    return 'article';
  }

  /**
   * 단지별 매물 조회 (필터 옵션)
   */
  async findByComplexId(
    complexId: string,
    options?: {
      tradeType?: string;
      minPrice?: bigint;
      maxPrice?: bigint;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Prisma.ArticleWhereInput = {
      complexId,
    };

    if (options?.tradeType) {
      where.tradeTypeName = options.tradeType;
    }

    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      where.dealOrWarrantPrcWon = {};
      if (options.minPrice !== undefined) {
        where.dealOrWarrantPrcWon.gte = options.minPrice;
      }
      if (options.maxPrice !== undefined) {
        where.dealOrWarrantPrcWon.lte = options.maxPrice;
      }
    }

    return this.prisma.article.findMany({
      where,
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 단지 번호로 매물 조회
   */
  async findByComplexNo(complexNo: string) {
    return this.prisma.article.findMany({
      where: {
        complex: { complexNo },
      },
      include: { complex: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 여러 단지의 매물 일괄 삭제
   */
  async deleteByComplexIds(complexIds: string[]) {
    return this.prisma.article.deleteMany({
      where: { complexId: { in: complexIds } },
    });
  }

  /**
   * 매물 일괄 생성 (중복 스킵)
   */
  async createMany(articles: Prisma.ArticleCreateManyInput[]) {
    return this.prisma.article.createMany({
      data: articles,
      skipDuplicates: true,
    });
  }

  /**
   * 매물 번호로 이전 매물 조회 (가격 변경 추적용)
   * Note: ArticleSnapshot 모델이 없으므로 Article에서 조회
   */
  async findPreviousByArticleNo(articleNo: string) {
    return this.prisma.article.findFirst({
      where: { articleNo },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 가격 범위 내 매물 수 집계
   */
  async countByPriceRange(complexId: string, minPrice: bigint, maxPrice: bigint) {
    return this.prisma.article.count({
      where: {
        complexId,
        dealOrWarrantPrcWon: {
          gte: minPrice,
          lte: maxPrice,
        },
      },
    });
  }

  /**
   * 거래 유형별 통계
   */
  async getStatsByTradeType(complexId: string) {
    return this.prisma.article.groupBy({
      by: ['tradeTypeName'],
      where: { complexId },
      _count: true,
    });
  }

  /**
   * 면적별 통계 (area1 기준)
   */
  async getStatsByArea(complexId: string) {
    return this.prisma.article.groupBy({
      by: ['area1'],
      where: { complexId },
      _count: true,
    });
  }

  /**
   * 최근 등록된 매물 조회 (전체)
   */
  async findRecent(limit = 50) {
    return this.prisma.article.findMany({
      take: limit,
      include: { complex: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 특정 기간 내 등록된 매물 조회
   */
  async findByDateRange(startDate: Date, endDate: Date) {
    return this.prisma.article.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { complex: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 매물 번호로 중복 체크
   */
  async existsByArticleNo(articleNo: string): Promise<boolean> {
    const count = await this.prisma.article.count({
      where: { articleNo },
    });
    return count > 0;
  }
}

// Singleton export
export const articleRepository = new ArticleRepository();
