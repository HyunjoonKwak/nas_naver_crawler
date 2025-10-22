# 🏗️ 아키텍처 리팩토링 계획서

**프로젝트**: NAS 네이버 부동산 크롤러  
**날짜**: 2025-10-22  
**목표**: 모놀리식 → 레이어드 아키텍처 + 이벤트 기반 시스템

---

## 📋 목차

1. [현재 아키텍처 분석](#현재-아키텍처-분석)
2. [레이어드 아키텍처 설계](#레이어드-아키텍처-설계)
3. [이벤트 기반 아키텍처 설계](#이벤트-기반-아키텍처-설계)
4. [데이터베이스 최적화](#데이터베이스-최적화)
5. [마이그레이션 전략](#마이그레이션-전략)
6. [예상 효과](#예상-효과)

---

## 현재 아키텍처 분석

### 현재 구조 (Monolithic)

```
┌──────────────────────────────────────────────┐
│  Next.js Application (Single Container)      │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Presentation Layer (혼재)             │  │
│  │  ├── app/                              │  │
│  │  │   ├── page.tsx (UI + Logic)        │  │
│  │  │   └── api/route.ts (Handler)       │  │
│  │  └── components/ (UI만)                │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Business Logic (혼재)                 │  │
│  │  ├── API Routes (Handler + Logic)     │  │
│  │  ├── lib/ (유틸리티 함수들)            │  │
│  │  └── logic/ (Python 크롤러)            │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Data Access (직접 접근)               │  │
│  │  ├── Prisma Client (곳곳에서 호출)    │  │
│  │  └── 트랜잭션 없음 (대부분)            │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Events (부분 구현)                    │  │
│  │  └── eventBroadcaster (SSE만)         │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
         ↓
  PostgreSQL Database
```

### 문제점

#### 1. **레이어 경계 불명확**
```typescript
// ❌ 현재: API Route에서 모든 걸 처리
export async function GET(request: NextRequest) {
  // 1. 인증 (Presentation)
  const currentUser = await requireAuth();
  
  // 2. 비즈니스 로직 (Business)
  const where = await getComplexWhereCondition(currentUser);
  
  // 3. 데이터 접근 (Data Access)
  const complexes = await prisma.complex.findMany({ where });
  
  // 4. 데이터 변환 (Business)
  const results = complexes.map(c => calculatePriceStats(c.articles));
  
  // 5. 응답 반환 (Presentation)
  return NextResponse.json({ complexes: results });
}
```

**문제**: 
- 단일 파일에 모든 책임이 집중
- 테스트 불가능
- 재사용 불가능
- 유지보수 어려움

#### 2. **이벤트 처리 부족**
```typescript
// ✅ 현재 있는 것: SSE 이벤트
eventBroadcaster.notifyCrawlComplete(crawlId, articlesCount);

// ❌ 없는 것:
// - 도메인 이벤트 (ArticleCreated, PriceChanged 등)
// - 이벤트 기반 알림
// - 이벤트 소싱
// - CQRS 패턴
```

#### 3. **트랜잭션 관리 미흡**
```bash
# grep으로 검색한 결과
prisma.$transaction 사용: 8건만

# ❌ 트랜잭션 없이 여러 쿼리 실행
await prisma.article.deleteMany({ where: { complexId } });
await prisma.article.createMany({ data: articlesToCreate });
# 중간에 실패하면? 데이터 불일치!
```

---

## 레이어드 아키텍처 설계

### 목표 구조

```
┌──────────────────────────────────────────────────────┐
│  1. Presentation Layer (API Routes, Controllers)     │
│     - HTTP 요청/응답 처리                             │
│     - 인증/인가 검증                                  │
│     - DTO 변환                                        │
│     - Rate Limiting                                   │
├──────────────────────────────────────────────────────┤
│  2. Application Layer (Use Cases, Services)          │
│     - 비즈니스 유스케이스 오케스트레이션              │
│     - 트랜잭션 관리                                   │
│     - 이벤트 발행                                     │
│     - 에러 핸들링                                     │
├──────────────────────────────────────────────────────┤
│  3. Domain Layer (Entities, Value Objects, Events)   │
│     - 비즈니스 로직                                   │
│     - 도메인 규칙                                     │
│     - 도메인 이벤트                                   │
│     - 불변 객체                                       │
├──────────────────────────────────────────────────────┤
│  4. Infrastructure Layer (Repository, External APIs) │
│     - 데이터베이스 접근                               │
│     - 외부 API 호출                                   │
│     - 파일 시스템                                     │
│     - 메시징                                          │
└──────────────────────────────────────────────────────┘
```

### 디렉토리 구조

```
src/
├── presentation/              # Presentation Layer
│   ├── api/
│   │   ├── controllers/      # API Controllers
│   │   │   ├── ComplexController.ts
│   │   │   ├── ArticleController.ts
│   │   │   └── CrawlController.ts
│   │   ├── dto/              # Data Transfer Objects
│   │   │   ├── ComplexDto.ts
│   │   │   └── ArticleDto.ts
│   │   ├── middleware/       # HTTP Middleware
│   │   │   ├── authMiddleware.ts
│   │   │   └── rateLimitMiddleware.ts
│   │   └── validators/       # Request Validators
│   │       └── complexValidator.ts
│   └── sse/                  # Server-Sent Events
│       └── eventBroadcaster.ts
│
├── application/               # Application Layer
│   ├── usecases/             # Use Cases
│   │   ├── complex/
│   │   │   ├── GetComplexListUseCase.ts
│   │   │   ├── GetComplexDetailUseCase.ts
│   │   │   └── CreateComplexUseCase.ts
│   │   ├── crawl/
│   │   │   ├── StartCrawlUseCase.ts
│   │   │   └── ProcessCrawlResultUseCase.ts
│   │   └── article/
│   │       ├── CreateArticleUseCase.ts
│   │       └── UpdateArticlePriceUseCase.ts
│   ├── services/             # Application Services
│   │   ├── ComplexService.ts
│   │   ├── ArticleService.ts
│   │   └── CrawlService.ts
│   ├── events/               # Event Handlers
│   │   ├── handlers/
│   │   │   ├── ArticleCreatedHandler.ts
│   │   │   ├── PriceChangedHandler.ts
│   │   │   └── CrawlCompletedHandler.ts
│   │   └── EventBus.ts
│   └── interfaces/           # Port Interfaces
│       ├── IComplexRepository.ts
│       ├── IArticleRepository.ts
│       └── ICrawlerService.ts
│
├── domain/                    # Domain Layer
│   ├── entities/             # Domain Entities
│   │   ├── Complex.ts
│   │   ├── Article.ts
│   │   ├── User.ts
│   │   └── CrawlHistory.ts
│   ├── value-objects/        # Value Objects
│   │   ├── Price.ts
│   │   ├── Area.ts
│   │   ├── Address.ts
│   │   └── ComplexNo.ts
│   ├── events/               # Domain Events
│   │   ├── ArticleCreatedEvent.ts
│   │   ├── PriceChangedEvent.ts
│   │   ├── CrawlStartedEvent.ts
│   │   └── CrawlCompletedEvent.ts
│   ├── aggregates/           # Aggregates
│   │   ├── ComplexAggregate.ts
│   │   └── CrawlAggregate.ts
│   └── specifications/       # Business Rules
│       ├── PriceRangeSpec.ts
│       └── ComplexActiveSpec.ts
│
└── infrastructure/            # Infrastructure Layer
    ├── persistence/
    │   ├── repositories/     # Repository Implementations
    │   │   ├── ComplexRepository.ts
    │   │   ├── ArticleRepository.ts
    │   │   └── UserRepository.ts
    │   ├── prisma/
    │   │   ├── PrismaClient.ts
    │   │   └── UnitOfWork.ts # 트랜잭션 관리
    │   └── cache/
    │       └── RedisCache.ts
    ├── external/             # External Services
    │   ├── NaverMapsClient.ts
    │   └── DiscordWebhook.ts
    ├── crawler/              # Crawler Service
    │   ├── PlaywrightCrawler.ts
    │   └── CrawlerQueue.ts
    └── messaging/            # Event Infrastructure
        ├── EventStore.ts
        └── MessageBroker.ts
```

---

## 상세 구현 예시

### 1. Presentation Layer

#### API Controller
```typescript
// presentation/api/controllers/ComplexController.ts
import { NextRequest, NextResponse } from 'next/server';
import { GetComplexListUseCase } from '@/application/usecases/complex/GetComplexListUseCase';
import { ComplexDtoMapper } from '@/presentation/api/dto/ComplexDto';
import { authMiddleware } from '@/presentation/api/middleware/authMiddleware';
import { rateLimitMiddleware } from '@/presentation/api/middleware/rateLimitMiddleware';
import { ApiResponse } from '@/presentation/api/ApiResponse';

export class ComplexController {
  constructor(
    private getComplexListUseCase: GetComplexListUseCase
  ) {}

  async getList(request: NextRequest): Promise<NextResponse> {
    try {
      // 1. Middleware 체인
      const authResult = await authMiddleware(request);
      if (authResult.error) return authResult.response;

      const rateLimitResult = await rateLimitMiddleware(request);
      if (rateLimitResult.error) return rateLimitResult.response;

      // 2. Request DTO 생성
      const { searchParams } = new URL(request.url);
      const query = {
        search: searchParams.get('search'),
        sortBy: searchParams.get('sortBy') || 'updatedAt',
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0'),
      };

      // 3. Use Case 실행
      const result = await this.getComplexListUseCase.execute({
        userId: authResult.user.id,
        ...query,
      });

      // 4. Response DTO 변환
      const dto = ComplexDtoMapper.toListResponse(result);

      // 5. 응답 반환
      return ApiResponse.success(dto);

    } catch (error) {
      return ApiResponse.error(error);
    }
  }
}
```

#### DTO (Data Transfer Object)
```typescript
// presentation/api/dto/ComplexDto.ts
export interface ComplexListResponseDto {
  complexes: ComplexDto[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ComplexDto {
  id: string;
  complexNo: string;
  complexName: string;
  address: string;
  priceStats: {
    avgPrice: string;
    minPrice: string;
    maxPrice: string;
  } | null;
  articleCount: number;
  isFavorite: boolean;
}

export class ComplexDtoMapper {
  static toListResponse(data: ComplexListResult): ComplexListResponseDto {
    return {
      complexes: data.complexes.map(c => this.toDto(c)),
      total: data.total,
      pagination: {
        limit: data.limit,
        offset: data.offset,
        hasMore: data.total > data.offset + data.limit,
      },
    };
  }

  static toDto(complex: Complex): ComplexDto {
    return {
      id: complex.id.value,
      complexNo: complex.complexNo.value,
      complexName: complex.name,
      address: complex.address.fullAddress,
      priceStats: complex.priceStats ? {
        avgPrice: complex.priceStats.avg.formatted,
        minPrice: complex.priceStats.min.formatted,
        maxPrice: complex.priceStats.max.formatted,
      } : null,
      articleCount: complex.articleCount,
      isFavorite: complex.isFavorite,
    };
  }
}
```

---

### 2. Application Layer

#### Use Case
```typescript
// application/usecases/complex/GetComplexListUseCase.ts
import { IComplexRepository } from '@/application/interfaces/IComplexRepository';
import { ComplexSpecification } from '@/domain/specifications/ComplexSpecification';
import { Complex } from '@/domain/entities/Complex';

export interface GetComplexListCommand {
  userId: string;
  search?: string;
  sortBy: string;
  limit: number;
  offset: number;
}

export interface ComplexListResult {
  complexes: Complex[];
  total: number;
  limit: number;
  offset: number;
}

export class GetComplexListUseCase {
  constructor(
    private complexRepository: IComplexRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(command: GetComplexListCommand): Promise<ComplexListResult> {
    // 1. 사용자 권한 확인 (Domain Logic)
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // 2. 조회 스펙 생성 (Domain Specification)
    const spec = ComplexSpecification.create({
      userId: user.id,
      userRole: user.role,
      search: command.search,
    });

    // 3. Repository에서 조회
    const complexes = await this.complexRepository.findMany(spec, {
      sortBy: command.sortBy,
      limit: command.limit,
      offset: command.offset,
    });

    const total = await this.complexRepository.count(spec);

    // 4. 가격 통계 계산 (Domain Logic)
    for (const complex of complexes) {
      await complex.calculatePriceStatistics();
    }

    return {
      complexes,
      total,
      limit: command.limit,
      offset: command.offset,
    };
  }
}
```

#### Application Service
```typescript
// application/services/CrawlService.ts
import { IUnitOfWork } from '@/application/interfaces/IUnitOfWork';
import { EventBus } from '@/application/events/EventBus';
import { CrawlStartedEvent } from '@/domain/events/CrawlStartedEvent';
import { CrawlCompletedEvent } from '@/domain/events/CrawlCompletedEvent';

export class CrawlService {
  constructor(
    private unitOfWork: IUnitOfWork,
    private complexRepository: IComplexRepository,
    private articleRepository: IArticleRepository,
    private crawlerService: ICrawlerService,
    private eventBus: EventBus
  ) {}

  async startCrawl(complexNos: string[], userId: string): Promise<string> {
    // 1. 트랜잭션 시작
    return await this.unitOfWork.execute(async () => {
      
      // 2. CrawlHistory 생성
      const crawlHistory = await this.crawlHistoryRepository.create({
        complexNos,
        userId,
        status: 'pending',
      });

      // 3. 이벤트 발행
      await this.eventBus.publish(
        new CrawlStartedEvent(crawlHistory.id, complexNos, userId)
      );

      return crawlHistory.id;
    });
  }

  async processCrawlResult(
    crawlId: string,
    rawData: any
  ): Promise<void> {
    // 트랜잭션으로 모든 작업 처리
    await this.unitOfWork.execute(async () => {
      
      // 1. 데이터 파싱
      const { complexData, articles } = this.parseCrawlData(rawData);

      // 2. Complex 업데이트/생성
      const complex = await this.complexRepository.upsert(complexData);

      // 3. 기존 매물 삭제
      await this.articleRepository.deleteByComplexId(complex.id);

      // 4. 새 매물 생성 (Batch)
      const createdArticles = await this.articleRepository.createMany(
        articles.map(a => ({
          ...a,
          complexId: complex.id,
          // ✅ 숫자 가격 변환
          dealOrWarrantPrcWon: Price.parse(a.dealOrWarrantPrc).toWon(),
          rentPrcWon: a.rentPrc ? Price.parse(a.rentPrc).toWon() : null,
        }))
      );

      // 5. CrawlHistory 업데이트
      await this.crawlHistoryRepository.updateStatus(crawlId, {
        status: 'success',
        totalArticles: createdArticles.length,
      });

      // 6. 이벤트 발행
      await this.eventBus.publish(
        new CrawlCompletedEvent(crawlId, complex.id, createdArticles.length)
      );
    });
  }
}
```

---

### 3. Domain Layer

#### Entity (Rich Domain Model)
```typescript
// domain/entities/Complex.ts
import { ComplexId } from '@/domain/value-objects/ComplexId';
import { ComplexNo } from '@/domain/value-objects/ComplexNo';
import { Address } from '@/domain/value-objects/Address';
import { PriceStatistics } from '@/domain/value-objects/PriceStatistics';

export class Complex {
  private constructor(
    public readonly id: ComplexId,
    public readonly complexNo: ComplexNo,
    public readonly name: string,
    public readonly address: Address,
    public readonly totalHousehold: number,
    public readonly totalDong: number,
    private _articles: Article[],
    private _priceStats: PriceStatistics | null = null
  ) {}

  static create(props: ComplexProps): Complex {
    // 비즈니스 규칙 검증
    if (props.totalHousehold < 1) {
      throw new DomainError('총 세대수는 1 이상이어야 합니다.');
    }

    return new Complex(
      ComplexId.create(),
      ComplexNo.create(props.complexNo),
      props.name,
      Address.create(props.address),
      props.totalHousehold,
      props.totalDong,
      []
    );
  }

  // 비즈니스 로직
  async calculatePriceStatistics(): Promise<void> {
    if (this._articles.length === 0) {
      this._priceStats = null;
      return;
    }

    const prices = this._articles
      .map(a => a.price)
      .filter(p => p.value > 0);

    if (prices.length === 0) {
      this._priceStats = null;
      return;
    }

    this._priceStats = PriceStatistics.calculate(prices);
  }

  get priceStats(): PriceStatistics | null {
    return this._priceStats;
  }

  get articleCount(): number {
    return this._articles.length;
  }

  // 도메인 규칙
  canAddArticle(article: Article): boolean {
    // 비즈니스 규칙: 같은 매물 번호는 추가 불가
    return !this._articles.some(a => a.articleNo.equals(article.articleNo));
  }

  addArticle(article: Article): void {
    if (!this.canAddArticle(article)) {
      throw new DomainError('이미 존재하는 매물입니다.');
    }

    this._articles.push(article);
    
    // 도메인 이벤트 발행
    this.addDomainEvent(
      new ArticleAddedEvent(this.id, article.id)
    );
  }
}
```

#### Value Object (불변 객체)
```typescript
// domain/value-objects/Price.ts
export class Price {
  private constructor(
    private readonly _value: bigint,
    private readonly _currency: 'KRW' = 'KRW'
  ) {
    if (_value < 0n) {
      throw new DomainError('가격은 0 이상이어야 합니다.');
    }
  }

  static create(won: bigint): Price {
    return new Price(won);
  }

  static parse(priceStr: string): Price {
    // "7억 6,000" → 760000000n
    const eokMatch = priceStr.match(/(\d+)억/);
    const manMatch = priceStr.match(/(\d+,?\d*)만?$/);
    
    const eok = eokMatch ? BigInt(eokMatch[1]) : 0n;
    const man = manMatch ? BigInt(manMatch[1].replace(/,/g, '')) : 0n;
    
    return new Price(eok * 100000000n + man * 10000n);
  }

  toWon(): bigint {
    return this._value;
  }

  get formatted(): string {
    const won = Number(this._value);
    const eok = Math.floor(won / 100000000);
    const man = Math.floor((won % 100000000) / 10000);
    
    if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}`;
    if (eok > 0) return `${eok}억`;
    return `${man.toLocaleString()}`;
  }

  get value(): bigint {
    return this._value;
  }

  equals(other: Price): boolean {
    return this._value === other._value;
  }

  isGreaterThan(other: Price): boolean {
    return this._value > other._value;
  }

  isLessThan(other: Price): boolean {
    return this._value < other._value;
  }
}
```

#### Domain Event
```typescript
// domain/events/ArticleCreatedEvent.ts
export class ArticleCreatedEvent extends DomainEvent {
  constructor(
    public readonly articleId: string,
    public readonly complexId: string,
    public readonly price: bigint,
    public readonly area: number,
    public readonly tradeType: string,
    occurredAt?: Date
  ) {
    super(occurredAt);
  }

  get eventName(): string {
    return 'article.created';
  }
}

// domain/events/PriceChangedEvent.ts
export class PriceChangedEvent extends DomainEvent {
  constructor(
    public readonly articleId: string,
    public readonly oldPrice: bigint,
    public readonly newPrice: bigint,
    public readonly changeRate: number,
    occurredAt?: Date
  ) {
    super(occurredAt);
  }

  get eventName(): string {
    return 'article.price_changed';
  }

  get priceChange(): bigint {
    return this.newPrice - this.oldPrice;
  }

  get isIncrease(): boolean {
    return this.newPrice > this.oldPrice;
  }
}
```

---

### 4. Infrastructure Layer

#### Repository Implementation
```typescript
// infrastructure/persistence/repositories/ComplexRepository.ts
import { IComplexRepository } from '@/application/interfaces/IComplexRepository';
import { Complex } from '@/domain/entities/Complex';
import { ComplexSpecification } from '@/domain/specifications/ComplexSpecification';
import { PrismaClient } from '@prisma/client';

export class ComplexRepository implements IComplexRepository {
  constructor(private prisma: PrismaClient) {}

  async findMany(
    spec: ComplexSpecification,
    options: QueryOptions
  ): Promise<Complex[]> {
    // 1. Specification을 Prisma where 조건으로 변환
    const where = this.specificationToWhere(spec);

    // 2. 데이터 조회 (N+1 방지)
    const complexes = await this.prisma.complex.findMany({
      where,
      select: {
        id: true,
        complexNo: true,
        complexName: true,
        address: true,
        roadAddress: true,
        latitude: true,
        longitude: true,
        totalHousehold: true,
        totalDong: true,
        _count: {
          select: { articles: true }
        }
      },
      orderBy: this.getSortOrder(options.sortBy),
      take: options.limit,
      skip: options.offset,
    });

    // 3. 가격 통계 별도 조회 (DB 집계)
    const complexIds = complexes.map(c => c.id);
    const priceStats = await this.prisma.article.groupBy({
      by: ['complexId'],
      where: {
        complexId: { in: complexIds },
      },
      _avg: { dealOrWarrantPrcWon: true },
      _min: { dealOrWarrantPrcWon: true },
      _max: { dealOrWarrantPrcWon: true },
    });

    // 4. Domain Entity로 변환
    return complexes.map(c => {
      const stats = priceStats.find(s => s.complexId === c.id);
      
      return Complex.reconstitute({
        id: c.id,
        complexNo: c.complexNo,
        name: c.complexName,
        address: {
          full: c.address,
          road: c.roadAddress,
          latitude: c.latitude,
          longitude: c.longitude,
        },
        totalHousehold: c.totalHousehold,
        totalDong: c.totalDong,
        articleCount: c._count.articles,
        priceStats: stats ? {
          avg: BigInt(stats._avg.dealOrWarrantPrcWon || 0),
          min: BigInt(stats._min.dealOrWarrantPrcWon || 0),
          max: BigInt(stats._max.dealOrWarrantPrcWon || 0),
        } : null,
      });
    });
  }

  async save(complex: Complex): Promise<void> {
    // Entity를 Prisma 모델로 변환
    await this.prisma.complex.upsert({
      where: { complexNo: complex.complexNo.value },
      update: {
        complexName: complex.name,
        address: complex.address.fullAddress,
        // ...
      },
      create: {
        complexNo: complex.complexNo.value,
        complexName: complex.name,
        address: complex.address.fullAddress,
        // ...
      },
    });
  }

  private specificationToWhere(spec: ComplexSpecification): any {
    // Specification 패턴 → Prisma where 조건 변환
    const where: any = {};

    if (spec.search) {
      where.OR = [
        { complexName: { contains: spec.search } },
        { address: { contains: spec.search } },
        { beopjungdong: { contains: spec.search } },
      ];
    }

    if (spec.userId) {
      // 사용자 권한 기반 필터링
      if (spec.userRole === 'GUEST') {
        where.userId = spec.userId;
      } else if (spec.userRole === 'FAMILY') {
        where.user = {
          OR: [
            { id: spec.userId },
            { role: { in: ['ADMIN', 'FAMILY'] } }
          ]
        };
      }
      // ADMIN은 모든 데이터 접근
    }

    return where;
  }
}
```

#### Unit of Work (트랜잭션 관리)
```typescript
// infrastructure/persistence/UnitOfWork.ts
import { IUnitOfWork } from '@/application/interfaces/IUnitOfWork';
import { PrismaClient } from '@prisma/client';

export class UnitOfWork implements IUnitOfWork {
  constructor(private prisma: PrismaClient) {}

  async execute<T>(
    work: (transaction: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      try {
        const result = await work(tx as PrismaClient);
        return result;
      } catch (error) {
        // 트랜잭션 자동 롤백
        throw error;
      }
    });
  }

  async executeWithRetry<T>(
    work: (transaction: PrismaClient) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.execute(work);
      } catch (error: any) {
        lastError = error;

        // 재시도 가능한 에러인지 확인
        if (this.isRetryableError(error)) {
          console.warn(`Transaction failed, retrying... (${attempt + 1}/${maxRetries})`);
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }

        // 재시도 불가능한 에러는 즉시 throw
        throw error;
      }
    }

    throw lastError || new Error('Transaction failed after retries');
  }

  private isRetryableError(error: any): boolean {
    // Deadlock, Connection timeout 등
    return (
      error.code === 'P2034' || // Prisma deadlock
      error.code === 'P2024' || // Timed out
      error.message?.includes('deadlock')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 이벤트 기반 아키텍처 설계

### Event Bus 구현

```typescript
// application/events/EventBus.ts
import { DomainEvent } from '@/domain/events/DomainEvent';
import { IEventHandler } from '@/application/events/IEventHandler';

export class EventBus {
  private handlers: Map<string, IEventHandler[]> = new Map();
  private eventStore: IEventStore;

  constructor(eventStore: IEventStore) {
    this.eventStore = eventStore;
  }

  // 핸들러 등록
  register(eventName: string, handler: IEventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  // 이벤트 발행 (동기)
  async publish(event: DomainEvent): Promise<void> {
    // 1. 이벤트 저장 (Event Sourcing)
    await this.eventStore.append(event);

    // 2. 핸들러 실행
    const handlers = this.handlers.get(event.eventName) || [];

    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Handler failed for ${event.eventName}:`, error);
        // 핸들러 실패는 이벤트 발행을 막지 않음
      }
    }
  }

  // 이벤트 발행 (비동기, 큐 사용)
  async publishAsync(event: DomainEvent): Promise<void> {
    // 메시지 큐에 전송 (RabbitMQ, Redis Queue 등)
    await this.messageBroker.send(event);
  }
}
```

### Event Handler 예시

```typescript
// application/events/handlers/ArticleCreatedHandler.ts
import { IEventHandler } from '@/application/events/IEventHandler';
import { ArticleCreatedEvent } from '@/domain/events/ArticleCreatedEvent';

export class SendAlertOnArticleCreatedHandler implements IEventHandler<ArticleCreatedEvent> {
  constructor(
    private alertRepository: IAlertRepository,
    private notificationService: INotificationService
  ) {}

  async handle(event: ArticleCreatedEvent): Promise<void> {
    // 1. 해당 단지에 대한 활성 알림 조회
    const alerts = await this.alertRepository.findActiveByComplexId(
      event.complexId
    );

    // 2. 조건에 맞는 알림 필터링
    const matchedAlerts = alerts.filter(alert => 
      this.matchesAlertCriteria(alert, event)
    );

    // 3. 알림 발송
    for (const alert of matchedAlerts) {
      await this.notificationService.send({
        alertId: alert.id,
        type: 'article_created',
        data: {
          articleId: event.articleId,
          price: event.price,
          area: event.area,
        },
      });
    }
  }

  private matchesAlertCriteria(alert: Alert, event: ArticleCreatedEvent): boolean {
    // 가격 조건
    if (alert.maxPrice && event.price > alert.maxPrice) return false;
    if (alert.minPrice && event.price < alert.minPrice) return false;

    // 면적 조건
    if (alert.maxArea && event.area > alert.maxArea) return false;
    if (alert.minArea && event.area < alert.minArea) return false;

    // 거래 유형
    if (alert.tradeTypes.length > 0 && !alert.tradeTypes.includes(event.tradeType)) {
      return false;
    }

    return true;
  }
}

// application/events/handlers/PriceChangedHandler.ts
export class SendAlertOnPriceChangedHandler implements IEventHandler<PriceChangedEvent> {
  async handle(event: PriceChangedEvent): Promise<void> {
    // 가격 변동 알림
    if (Math.abs(event.changeRate) >= 5.0) {
      // 5% 이상 변동 시 알림
      await this.notificationService.send({
        type: 'price_changed',
        data: {
          articleId: event.articleId,
          oldPrice: event.oldPrice,
          newPrice: event.newPrice,
          changeRate: event.changeRate,
        },
      });
    }
  }
}

// application/events/handlers/UpdatePriceStatisticsHandler.ts
export class UpdatePriceStatisticsHandler implements IEventHandler<ArticleCreatedEvent> {
  constructor(
    private complexRepository: IComplexRepository,
    private cache: ICache
  ) {}

  async handle(event: ArticleCreatedEvent): Promise<void> {
    // 단지 가격 통계 캐시 무효화
    await this.cache.delete(`complex:${event.complexId}:price_stats`);

    // 가격 통계 재계산 (백그라운드)
    const complex = await this.complexRepository.findById(event.complexId);
    if (complex) {
      await complex.calculatePriceStatistics();
      await this.complexRepository.save(complex);
    }
  }
}
```

### Event Sourcing (선택적)

```typescript
// infrastructure/messaging/EventStore.ts
export class EventStore implements IEventStore {
  constructor(private prisma: PrismaClient) {}

  async append(event: DomainEvent): Promise<void> {
    await this.prisma.domainEvent.create({
      data: {
        eventId: event.eventId,
        eventName: event.eventName,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventData: JSON.stringify(event.toJSON()),
        occurredAt: event.occurredAt,
        version: event.version,
      },
    });
  }

  async getEvents(
    aggregateId: string,
    fromVersion?: number
  ): Promise<DomainEvent[]> {
    const events = await this.prisma.domainEvent.findMany({
      where: {
        aggregateId,
        ...(fromVersion && { version: { gte: fromVersion } }),
      },
      orderBy: { version: 'asc' },
    });

    return events.map(e => this.deserializeEvent(e));
  }

  // 이벤트 리플레이 (Aggregate 재구성)
  async replay(aggregateId: string): Promise<any> {
    const events = await this.getEvents(aggregateId);
    
    // 이벤트를 순서대로 적용하여 상태 재구성
    let state = {};
    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }
}
```

---

## 데이터베이스 최적화

### 1. 인덱스 최적화

#### 현재 인덱스 분석

```prisma
// prisma/schema.prisma - Article 모델
model Article {
  // ... fields

  @@index([complexId])                           // ✅ 단일
  @@index([tradeTypeName])                        // ✅ 단일
  @@index([dealOrWarrantPrc])                     // ❌ 문자열 (사용 안 함)
  @@index([dealOrWarrantPrcWon])                  // ✅ 숫자 (준비됨, 미사용)
  @@index([rentPrcWon])                           // ✅ 숫자
  @@index([articleConfirmYmd])                    // ✅ 단일
  @@index([createdAt])                            // ✅ 시계열
  @@index([complexId, createdAt])                 // ✅ 복합
  @@index([complexId, tradeTypeName])             // ✅ 복합
  @@index([tradeTypeName, dealOrWarrantPrcWon])   // ✅ 복합
}
```

#### 개선된 인덱스 전략

```prisma
// ✅ 개선된 스키마
model Article {
  // ... fields

  // === 단일 인덱스 (범위 검색) ===
  @@index([dealOrWarrantPrcWon])        // 가격 정렬
  @@index([rentPrcWon])                 // 월세 정렬
  @@index([area1])                      // 면적 필터링
  @@index([createdAt])                  // 시계열 조회
  @@index([articleConfirmYmd])          // 매물 확인일

  // === 복합 인덱스 (커버링 인덱스) ===
  // 단지별 최신 매물 (가장 자주 사용)
  @@index([complexId, createdAt(sort: Desc)])
  
  // 단지별 거래유형 필터링
  @@index([complexId, tradeTypeName])
  
  // 거래유형별 가격 정렬 (목록 페이지)
  @@index([tradeTypeName, dealOrWarrantPrcWon])
  
  // 가격 범위 검색 (필터링)
  @@index([complexId, dealOrWarrantPrcWon, tradeTypeName])
  
  // 면적별 가격 조회
  @@index([complexId, area1, dealOrWarrantPrcWon])
  
  // 24시간 매물 변동 (대시보드)
  @@index([complexId, createdAt(sort: Desc)]) where createdAt >= now() - interval '24 hours'
  
  // === 부분 인덱스 (조건부) ===
  // 활성 매물만 (삭제되지 않은)
  @@index([complexId, createdAt]) where isDeleted = false
  
  // 가격이 있는 매물만
  @@index([complexId, dealOrWarrantPrcWon]) where dealOrWarrantPrcWon > 0
}

model Complex {
  // === 텍스트 검색 (Full-Text Search) ===
  @@index([complexName(ops: raw("gin_trgm_ops"))], type: Gin) // PostgreSQL trigram
  @@index([address(ops: raw("gin_trgm_ops"))], type: Gin)
  
  // === 지리 검색 (PostGIS) ===
  @@index([latitude, longitude], type: Gist) // 근처 단지 검색
  
  // === 복합 인덱스 ===
  @@index([userId, beopjungdong])          // 사용자별 지역 필터
  @@index([beopjungdong, updatedAt])       // 지역별 최신 단지
}

model CrawlHistory {
  // === 복합 인덱스 ===
  @@index([userId, status, startedAt(sort: Desc)]) // 사용자별 히스토리
  @@index([scheduleId, status, startedAt])         // 스케줄 실행 이력
  
  // === 부분 인덱스 ===
  @@index([status]) where status IN ('crawling', 'running') // 진행 중인 크롤링만
}
```

#### 인덱스 사용 쿼리 최적화

```sql
-- ❌ 나쁜 예: 인덱스 사용 불가
EXPLAIN ANALYZE
SELECT * FROM articles 
WHERE CAST(deal_or_warrant_prc AS INTEGER) > 500000000;
-- Seq Scan (인덱스 미사용)

-- ✅ 좋은 예: 인덱스 사용
EXPLAIN ANALYZE
SELECT * FROM articles 
WHERE deal_or_warrant_prc_won > 500000000;
-- Index Scan using articles_deal_or_warrant_prc_won_idx

-- ✅ 커버링 인덱스
EXPLAIN ANALYZE
SELECT complex_id, deal_or_warrant_prc_won, created_at
FROM articles 
WHERE complex_id = '...' AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 100;
-- Index Only Scan (데이터 블록 접근 없이 인덱스만 읽음)
```

---

### 2. 캐시 최적화

#### Redis 기반 다층 캐싱

```typescript
// infrastructure/cache/CacheStrategy.ts
export class CacheStrategy {
  constructor(
    private redisClient: RedisClient,
    private memoryCache: MemoryCache
  ) {}

  // L1: 메모리 캐시 (초고속, 작은 데이터)
  // L2: Redis 캐시 (빠름, 큰 데이터)
  // L3: 데이터베이스 (느림, 영구 저장)

  async get<T>(key: string): Promise<T | null> {
    // L1: 메모리 캐시
    const memCached = this.memoryCache.get<T>(key);
    if (memCached) {
      console.log('[Cache] L1 HIT:', key);
      return memCached;
    }

    // L2: Redis 캐시
    const redisCached = await this.redisClient.get(key);
    if (redisCached) {
      console.log('[Cache] L2 HIT:', key);
      const data = JSON.parse(redisCached) as T;
      
      // L1에도 저장 (Write-through)
      this.memoryCache.set(key, data, 60); // 1분
      
      return data;
    }

    console.log('[Cache] MISS:', key);
    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // L1 & L2 동시 저장
    this.memoryCache.set(key, value, Math.min(ttl, 300)); // 최대 5분
    await this.redisClient.setex(key, ttl, JSON.stringify(value));
  }

  async delete(pattern: string): Promise<void> {
    // L1 & L2 동시 삭제
    this.memoryCache.deletePattern(pattern);
    
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}
```

#### 캐시 키 설계

```typescript
// infrastructure/cache/CacheKeys.ts
export const CacheKeys = {
  // 단지 관련
  complex: {
    detail: (complexId: string) => `complex:${complexId}`,
    priceStats: (complexId: string) => `complex:${complexId}:price_stats`,
    articleCount: (complexId: string) => `complex:${complexId}:article_count`,
    list: (userId: string, page: number) => `complex:list:${userId}:${page}`,
  },

  // 매물 관련
  article: {
    list: (complexId: string, page: number) => `article:list:${complexId}:${page}`,
    byComplex: (complexId: string) => `article:complex:${complexId}:*`,
  },

  // 통계 관련
  stats: {
    dashboard: (userId: string) => `stats:dashboard:${userId}`,
    priceTrend: (complexNo: string, days: number) => `stats:price_trend:${complexNo}:${days}d`,
  },

  // 사용자 관련
  user: {
    favorites: (userId: string) => `user:${userId}:favorites`,
    alerts: (userId: string) => `user:${userId}:alerts`,
  },
};

// TTL 설정
export const CacheTTL = {
  short: 60,           // 1분 (자주 변하는 데이터)
  medium: 300,         // 5분 (일반 데이터)
  long: 1800,          // 30분 (잘 안 변하는 데이터)
  veryLong: 86400,     // 1일 (거의 안 변하는 데이터)
};
```

#### 캐시 무효화 전략

```typescript
// application/events/handlers/InvalidateCacheHandler.ts
export class InvalidateCacheOnArticleChangedHandler implements IEventHandler {
  constructor(private cache: CacheStrategy) {}

  async handle(event: ArticleCreatedEvent | ArticleDeletedEvent): Promise<void> {
    const complexId = event.complexId;

    // 관련 캐시 무효화
    await this.cache.delete(CacheKeys.complex.priceStats(complexId));
    await this.cache.delete(CacheKeys.complex.articleCount(complexId));
    await this.cache.delete(CacheKeys.article.byComplex(complexId));
    
    // 목록 캐시 무효화 (페이지네이션)
    await this.cache.delete(`article:list:${complexId}:*`);
    
    // 통계 캐시 무효화
    await this.cache.delete(`stats:*`);
  }
}
```

#### 캐시 warming (선택적)

```typescript
// infrastructure/cache/CacheWarmer.ts
export class CacheWarmer {
  constructor(
    private cache: CacheStrategy,
    private complexRepository: IComplexRepository
  ) {}

  // 서버 시작 시 핫 데이터 사전 캐싱
  async warmUp(): Promise<void> {
    console.log('[Cache] Warming up...');

    // 인기 단지 TOP 100
    const popularComplexes = await this.complexRepository.findPopular(100);

    for (const complex of popularComplexes) {
      // 가격 통계 캐싱
      await complex.calculatePriceStatistics();
      await this.cache.set(
        CacheKeys.complex.priceStats(complex.id.value),
        complex.priceStats,
        CacheTTL.long
      );
    }

    console.log('[Cache] Warmed up 100 popular complexes');
  }
}
```

---

### 3. 파티셔닝 전략

#### 테이블 파티셔닝 (대용량 데이터)

```sql
-- ✅ Article 테이블 파티셔닝 (시계열)
-- 월별로 파티션 분리 (1년치 = 12개 파티션)

-- 1. 파티션 테이블 생성
CREATE TABLE articles (
  id UUID PRIMARY KEY,
  complex_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  -- ... 기타 컬럼
) PARTITION BY RANGE (created_at);

-- 2. 월별 파티션 생성
CREATE TABLE articles_2025_01 PARTITION OF articles
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE articles_2025_02 PARTITION OF articles
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- ... 12개월치

-- 3. 자동 파티션 생성 함수 (PostgreSQL)
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  -- 다음 달 파티션 생성
  partition_date := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
  partition_name := 'articles_' || to_char(partition_date, 'YYYY_MM');
  start_date := partition_date;
  end_date := partition_date + INTERVAL '1 month';

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF articles FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
  
  RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- 4. 매월 1일 자동 실행 (Cron)
-- pg_cron 확장 사용
SELECT cron.schedule('create-monthly-partition', '0 0 1 * *', 'SELECT create_monthly_partition()');
```

#### 파티션 쿼리 최적화

```typescript
// infrastructure/persistence/repositories/ArticleRepository.ts
export class ArticleRepository {
  // ✅ 파티션 프루닝 활용
  async findRecentArticles(
    complexId: string,
    days: number
  ): Promise<Article[]> {
    // WHERE 절에 파티션 키(created_at) 포함
    // → PostgreSQL이 관련 파티션만 스캔
    return await this.prisma.article.findMany({
      where: {
        complexId,
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

// SQL 설명
EXPLAIN ANALYZE
SELECT * FROM articles 
WHERE complex_id = '...' 
  AND created_at >= now() - interval '7 days' -- 파티션 키!
ORDER BY created_at DESC
LIMIT 100;

-- 결과:
-- Append (actual time=0.123..1.234 rows=100)
--   -> Index Scan on articles_2025_10 (actual time=0.100..1.000)
--   -> Index Scan on articles_2025_11 (actual time=0.023..0.234)
-- Planning Time: 0.456 ms
-- Execution Time: 1.345 ms
```

#### 파티션 유지보수

```sql
-- 오래된 파티션 제거 (데이터 보관 정책)
-- 예: 1년 이상 된 데이터 삭제
DROP TABLE IF EXISTS articles_2024_01;
DROP TABLE IF EXISTS articles_2024_02;

-- 또는 아카이브 테이블로 이동
CREATE TABLE articles_archive PARTITION OF articles_historical;
INSERT INTO articles_archive SELECT * FROM articles_2024_01;
DROP TABLE articles_2024_01;
```

---

### 4. 읽기/쓰기 분리 (Read Replica)

```typescript
// infrastructure/persistence/DatabaseRouter.ts
export class DatabaseRouter {
  constructor(
    private masterPrisma: PrismaClient,  // 쓰기
    private replicaPrisma: PrismaClient   // 읽기 (Read Replica)
  ) {}

  // 읽기 쿼리는 Replica로
  getReadClient(): PrismaClient {
    return this.replicaPrisma;
  }

  // 쓰기 쿼리는 Master로
  getWriteClient(): PrismaClient {
    return this.masterPrisma;
  }
}

// infrastructure/persistence/repositories/ComplexRepository.ts
export class ComplexRepository {
  constructor(private dbRouter: DatabaseRouter) {}

  // 읽기 전용
  async findMany(spec: ComplexSpecification): Promise<Complex[]> {
    return await this.dbRouter.getReadClient().complex.findMany({
      where: this.specToWhere(spec),
    });
  }

  // 쓰기
  async save(complex: Complex): Promise<void> {
    await this.dbRouter.getWriteClient().complex.upsert({
      where: { id: complex.id.value },
      update: { /* ... */ },
      create: { /* ... */ },
    });
  }
}
```

#### docker-compose.yml (Read Replica)

```yaml
services:
  db-master:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: naver_crawler
      POSTGRES_USER: crawler
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_master:/var/lib/postgresql/data
    command: >
      postgres
      -c wal_level=replica
      -c max_wal_senders=3
      -c max_replication_slots=3

  db-replica:
    image: postgres:16-alpine
    environment:
      PGUSER: replicator
      PGPASSWORD: ${REPLICATOR_PASSWORD}
    volumes:
      - postgres_replica:/var/lib/postgresql/data
    command: >
      postgres
      -c primary_conninfo='host=db-master port=5432 user=replicator password=${REPLICATOR_PASSWORD}'
      -c primary_slot_name=replica_slot

volumes:
  postgres_master:
  postgres_replica:
```

---

## 마이그레이션 전략

### Phase 1: 레이어 분리 (4주)

#### Week 1: Infrastructure Layer
```bash
# 작업 목표
- Repository 패턴 구현
- UnitOfWork 구현
- 기존 Prisma 호출을 Repository로 래핑

# 예시
git checkout -b refactor/infrastructure-layer
mkdir -p src/infrastructure/persistence/repositories
# ... 구현
git commit -m "feat: Add Repository pattern"
```

#### Week 2: Domain Layer
```bash
# 작업 목표
- Entity 클래스 생성
- Value Object 생성
- Domain Event 정의

git checkout -b refactor/domain-layer
mkdir -p src/domain/{entities,value-objects,events}
# ... 구현
```

#### Week 3: Application Layer
```bash
# 작업 목표
- Use Case 구현
- Application Service 구현
- EventBus 구현
```

#### Week 4: Presentation Layer
```bash
# 작업 목표
- Controller 분리
- DTO 정의
- API Route 리팩토링
```

---

### Phase 2: 이벤트 기반 전환 (3주)

#### Week 5-6: Event Infrastructure
- EventBus 구현
- EventStore 구현
- Event Handler 등록

#### Week 7: Event Migration
- 기존 동기 호출을 이벤트로 전환
- 알림 시스템 이벤트 기반으로 변경

---

### Phase 3: 데이터베이스 최적화 (3주)

#### Week 8: 인덱스 최적화
- 숫자 가격 컬럼 활성화
- 불필요한 인덱스 제거
- 복합 인덱스 추가

#### Week 9: 캐시 시스템
- Redis 도입
- 다층 캐싱 구현
- 캐시 무효화 전략

#### Week 10: 파티셔닝
- Article 테이블 파티셔닝
- 자동 파티션 생성
- 읽기 레플리카 구축

---

## 예상 효과

### 성능 개선

| 지표 | 현재 | Phase 1 | Phase 2 | Phase 3 | 개선율 |
|------|------|---------|---------|---------|--------|
| **API 응답 시간** | 2-5초 | 1-3초 | 500ms-1초 | 100-300ms | **95%** |
| **동시 처리량** | 20 req/s | 50 req/s | 100 req/s | 500 req/s | **25배** |
| **메모리 사용** | 1.5-2GB | 1-1.5GB | 800MB-1GB | 500MB-800MB | **70%** |
| **DB 쿼리 수** | 100+ | 50 | 20 | 10 | **90%** |

### 코드 품질

| 항목 | 현재 | 개선 후 |
|------|------|---------|
| **테스트 커버리지** | 0% | 80%+ |
| **코드 중복** | 높음 | 낮음 |
| **결합도** | 높음 (Tight) | 낮음 (Loose) |
| **응집도** | 낮음 | 높음 |
| **유지보수성** | 어려움 | 쉬움 |

---

## 결론

### 핵심 개선 사항

1. **레이어드 아키텍처**: 책임 분리, 테스트 가능, 재사용 가능
2. **이벤트 기반**: 느슨한 결합, 비동기 처리, 확장성
3. **DB 최적화**: 숫자 컬럼, 인덱스, 캐싱, 파티셔닝

### 투자 대비 효과

- **개발 시간**: 10주 (2.5개월)
- **ROI**: 3-6개월 내 회수
- **장기 이득**: 유지보수 비용 70% 감소

### 다음 단계

1. ✅ **즉시**: 숫자 가격 컬럼 활성화 (1주)
2. ✅ **단기**: Repository 패턴 도입 (2주)
3. ✅ **중기**: 레이어드 아키텍처 전환 (4주)
4. ✅ **장기**: 이벤트 기반 + DB 최적화 (6주)

---

**작성자**: AI 아키텍처 분석 시스템  
**날짜**: 2025-10-22  
**버전**: 1.0.0

