# Database Repository Pattern

> Week 3 Day 14-15: Implementing Repository Pattern for data access abstraction

## 목표

Prisma 쿼리를 직접 사용하는 서비스 코드를 Repository 패턴으로 추상화하여:
- 데이터 접근 로직을 중앙화
- 테스트 용이성 향상 (mock 가능)
- 복잡한 쿼리 로직을 재사용 가능하게 구성
- 비즈니스 로직과 데이터 접근 로직 분리

## Repository 계층 구조

```
services/
  ├── crawl-workflow.ts       (비즈니스 로직 - Repository 사용)
  ├── crawl-db-service.ts     (비즈니스 로직 - Repository 사용)
  └── alert-service.ts        (비즈니스 로직 - Repository 사용)

repositories/
  ├── index.ts                (모든 repository export)
  ├── base-repository.ts      (공통 CRUD 메서드)
  ├── complex.repository.ts   (Complex 전용 쿼리)
  ├── article.repository.ts   (Article 전용 쿼리)
  ├── crawl-history.repository.ts
  ├── alert.repository.ts
  └── types.ts                (Repository 타입)
```

## Base Repository

모든 repository가 상속받을 기본 클래스:

```typescript
// repositories/base-repository.ts
import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T> {
  constructor(protected prisma: PrismaClient) {}

  abstract getModelName(): string;

  async findById(id: string): Promise<T | null> {
    const model = this.getModel();
    return model.findUnique({ where: { id } }) as Promise<T | null>;
  }

  async findMany(where?: any, options?: any): Promise<T[]> {
    const model = this.getModel();
    return model.findMany({ where, ...options }) as Promise<T[]>;
  }

  async create(data: any): Promise<T> {
    const model = this.getModel();
    return model.create({ data }) as Promise<T>;
  }

  async update(id: string, data: any): Promise<T> {
    const model = this.getModel();
    return model.update({ where: { id }, data }) as Promise<T>;
  }

  async delete(id: string): Promise<T> {
    const model = this.getModel();
    return model.delete({ where: { id } }) as Promise<T>;
  }

  protected getModel(): any {
    return (this.prisma as any)[this.getModelName()];
  }
}
```

## Complex Repository

단지(Complex) 관련 쿼리 전담:

```typescript
// repositories/complex.repository.ts
import { Complex, Prisma } from '@prisma/client';
import { BaseRepository } from './base-repository';
import { prisma } from '@/lib/prisma';

export class ComplexRepository extends BaseRepository<Complex> {
  constructor() {
    super(prisma);
  }

  getModelName() {
    return 'complex';
  }

  /**
   * 단지 번호로 조회 (매물 포함)
   */
  async findByComplexNo(complexNo: string, includeArticles = false) {
    return this.prisma.complex.findFirst({
      where: { complexNo },
      include: includeArticles ? { articles: true } : undefined,
    });
  }

  /**
   * 여러 단지 번호로 일괄 조회
   */
  async findManyByComplexNos(complexNos: string[], includeArticles = false) {
    return this.prisma.complex.findMany({
      where: { complexNo: { in: complexNos } },
      include: includeArticles ? { articles: true } : undefined,
    });
  }

  /**
   * 단지 번호 매핑 (complexNo → id)
   */
  async getComplexNoToIdMap(complexNos: string[]): Promise<Map<string, string>> {
    const complexes = await this.prisma.complex.findMany({
      where: { complexNo: { in: complexNos } },
      select: { id: true, complexNo: true },
    });

    return new Map(complexes.map((c) => [c.complexNo, c.id]));
  }

  /**
   * 단지 일괄 생성/업데이트 (upsert)
   */
  async upsertMany(complexData: Prisma.ComplexCreateInput[]) {
    const results = await Promise.all(
      complexData.map((data) =>
        this.prisma.complex.upsert({
          where: { complexNo: data.complexNo },
          update: data,
          create: data,
        })
      )
    );
    return results;
  }

  /**
   * 사용자의 즐겨찾기 단지 조회
   */
  async findFavoritesByUserId(userId: string) {
    return this.prisma.complex.findMany({
      where: {
        favorites: {
          some: { userId },
        },
      },
      include: {
        articles: true,
        favorites: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 지역 기반 검색 (법정동)
   */
  async findByRegion(beopjungdong: string) {
    return this.prisma.complex.findMany({
      where: {
        beopjungdong: {
          contains: beopjungdong,
        },
      },
      include: {
        articles: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * 기존 지오코딩 데이터 조회 (merge용)
   */
  async getExistingGeoData(complexNos: string[]) {
    return this.prisma.complex.findMany({
      where: { complexNo: { in: complexNos } },
      select: {
        complexNo: true,
        latitude: true,
        longitude: true,
        beopjungdong: true,
        roadNameAddress: true,
        jibunAddress: true,
      },
    });
  }
}

// Singleton export
export const complexRepository = new ComplexRepository();
```

## Article Repository

매물(Article) 관련 쿼리 전담:

```typescript
// repositories/article.repository.ts
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
   * 단지별 매물 조회
   */
  async findByComplexId(complexId: string, options?: {
    tradeType?: string;
    minPrice?: bigint;
    maxPrice?: bigint;
    limit?: number;
  }) {
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 단지 번호로 매물 조회 (articleNo 기준 중복 제거)
   */
  async findByComplexNo(complexNo: string) {
    return this.prisma.article.findMany({
      where: {
        complex: { complexNo },
      },
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
   * 매물 번호로 최근 스냅샷 조회 (이전 가격 추적용)
   */
  async findLatestSnapshotByArticleNo(articleNo: string) {
    return this.prisma.articleSnapshot.findFirst({
      where: { articleNo },
      orderBy: { snapshotDate: 'desc' },
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
}

// Singleton export
export const articleRepository = new ArticleRepository();
```

## CrawlHistory Repository

크롤링 히스토리 관련:

```typescript
// repositories/crawl-history.repository.ts
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
}

// Singleton export
export const crawlHistoryRepository = new CrawlHistoryRepository();
```

## Alert Repository

알림 관련:

```typescript
// repositories/alert.repository.ts
import { Alert, Prisma } from '@prisma/client';
import { BaseRepository } from './base-repository';
import { prisma } from '@/lib/prisma';

export class AlertRepository extends BaseRepository<Alert> {
  constructor() {
    super(prisma);
  }

  getModelName() {
    return 'alert';
  }

  /**
   * 활성화된 알림 조회 (webhookUrl 있는 것만)
   */
  async findActiveWithWebhook(userId?: string) {
    const where: Prisma.AlertWhereInput = {
      isActive: true,
      webhookUrl: { not: null },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.alert.findMany({
      where,
      include: { user: true },
    });
  }

  /**
   * 단지별 활성 알림 조회
   */
  async findActiveByComplexNo(complexNo: string) {
    return this.prisma.alert.findMany({
      where: {
        isActive: true,
        complexNos: { has: complexNo },
      },
      include: { user: true },
    });
  }
}

// Singleton export
export const alertRepository = new AlertRepository();
```

## Index File

모든 repository를 중앙에서 export:

```typescript
// repositories/index.ts
export * from './base-repository';
export * from './complex.repository';
export * from './article.repository';
export * from './crawl-history.repository';
export * from './alert.repository';

// Singleton instances
export {
  complexRepository,
  articleRepository,
  crawlHistoryRepository,
  alertRepository,
};
```

## 사용 예시

### Before (서비스에서 직접 Prisma 사용)

```typescript
// services/complex-processor.ts (Before)
import { prisma } from '@/lib/prisma';

const complexes = await prisma.complex.findMany({
  where: { complexNo: { in: complexNos } },
  select: { complexNo: true, latitude: true, longitude: true },
});
```

### After (Repository 사용)

```typescript
// services/complex-processor.ts (After)
import { complexRepository } from '@/repositories';

const existingGeoData = await complexRepository.getExistingGeoData(complexNos);
```

## 마이그레이션 전략

### Phase 1: Repository 파일 생성 ✅
- [ ] `repositories/base-repository.ts`
- [ ] `repositories/complex.repository.ts`
- [ ] `repositories/article.repository.ts`
- [ ] `repositories/crawl-history.repository.ts`
- [ ] `repositories/alert.repository.ts`
- [ ] `repositories/index.ts`

### Phase 2: 서비스에서 Repository 사용
- [ ] `services/complex-processor.ts` - complexRepository 사용
- [ ] `services/article-processor.ts` - articleRepository 사용
- [ ] `services/crawl-db-service.ts` - 여러 repository 조합
- [ ] `services/alert-service.ts` - alertRepository, complexRepository 사용
- [ ] `services/crawl-workflow.ts` - crawlHistoryRepository 사용

### Phase 3: API 라우트에서 Repository 사용
- [ ] `app/api/complexes/route.ts`
- [ ] `app/api/articles/route.ts`
- [ ] `app/api/crawl-history/route.ts`
- [ ] `app/api/alerts/route.ts`

## 이점

1. **테스트 용이성**: Repository를 mock하여 서비스 로직만 단위 테스트 가능
2. **코드 재사용**: 자주 사용하는 쿼리를 repository 메서드로 추상화
3. **변경 격리**: DB 스키마 변경 시 repository만 수정하면 됨
4. **타입 안정성**: Repository 메서드가 타입을 보장
5. **비즈니스 로직 집중**: 서비스는 데이터 접근 세부사항을 몰라도 됨

## 주의사항

- **과도한 추상화 지양**: 간단한 CRUD는 직접 Prisma 사용해도 됨
- **Repository는 Stateless**: 상태를 저장하지 않고 singleton으로 사용
- **트랜잭션 지원**: 복잡한 트랜잭션은 서비스 레이어에서 관리
