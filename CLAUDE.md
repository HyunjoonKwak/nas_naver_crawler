# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Naver Real Estate Crawler** - A NAS-optimized web crawler for collecting apartment listings from Naver Real Estate with a Next.js web interface. The system runs in development mode for fast hot-reload deployments on NAS environments.

**⚠️ Important:** This project runs on a NAS and operates in **development mode** by default for rapid deployment. Do NOT convert to production mode without explicit instructions. Database operations are remote (NAS-based) - do not attempt local database searches.

## Essential Commands

### Development & Deployment
```bash
# Start development mode (default, 3-second restart)
./manage.sh  # Option 8: Start dev mode
docker-compose -f docker-compose.dev.yml up -d

# Quick deployment after git pull
cd /volume1/docker/naver-crawler
git pull origin main
docker-compose restart web  # 3 seconds!

# Build (production mode only)
./manage.sh  # Option 6: Build
next build

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm test                    # Run all tests
npm run test:coverage       # With coverage
vitest run __tests__/lib/api-error.test.ts  # Single test
```

### Database Operations
```bash
# Prisma operations
npx prisma generate        # Generate client after schema changes
npx prisma migrate dev     # Create and apply migration
npx prisma db push         # Push schema without migration
npx prisma studio          # Open database GUI

# Direct database access
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler
```

### Crawler Operations
```bash
# Run crawler manually (Python)
python3 logic/nas_playwright_crawler.py --complex-no 22065

# Check crawler logs
docker-compose logs -f web | grep "Crawler"

# Performance verification
./scripts/verify-perf-improve.sh
```

## Architecture

### Full-Stack Architecture (Next.js + Python + PostgreSQL + Redis)

This is a **hybrid monorepo** combining TypeScript (Next.js) frontend/API and Python (Playwright) crawling engine:

**Frontend/API Layer (TypeScript/Next.js 14)**
- `app/` - Next.js App Router with Pages and API routes
- `components/` - React components (forms, tables, modals)
- `lib/` - Shared utilities, auth, caching, validation

**Crawler Engine (Python)**
- `logic/nas_playwright_crawler.py` - Playwright-based headless browser crawler
- `logic/scheduler.py` - Cron-based scheduling engine
- Communicates with Next.js via file system and database

**Data Layer**
- PostgreSQL: Primary database (Prisma ORM)
- Redis: L2 cache layer (multi-layer caching with in-memory L1)
- File system: Crawled data stored as JSON/CSV

### Key Subsystems

#### Authentication & Authorization (NextAuth.js)
- Credentials-based auth with bcrypt password hashing
- Role-based access: ADMIN, FAMILY, GUEST
- Approval workflow: Users must be approved by admin
- Session strategy: JWT (7-day expiry, 24-hour refresh)
- Location: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`

#### Caching Strategy (Redis + Memory)
- **L1 Cache**: In-memory Map (60s TTL, fast local access)
- **L2 Cache**: Redis (configurable TTL: 60s-86400s)
- Cache-Aside pattern with automatic write-through
- Location: `lib/redis-cache.ts`
- Cache invalidation: Pattern-based deletion (e.g., `complex:*`)

#### Crawler Architecture (Python Playwright)
- Headless Chromium browser for bot detection avoidance
- Infinite scroll handling: Progressive 800px scrolling with dynamic waits
- API interception: Captures Naver API responses during scroll
- Deduplication: "Same address grouping" to merge duplicate listings
- Database integration: Direct Prisma writes for real-time data
- Location: `logic/nas_playwright_crawler.py`

#### Scheduling System (node-cron)
- Cron-based automatic crawling with timezone handling (KST)
- Dynamic vs. static complex list modes:
  - Dynamic: Uses user's current bookmarked complexes
  - Static: Fixed list of complex numbers
- Duplicate execution prevention via Redis locks (3min TTL)
- Location: `lib/scheduler.ts`, `app/api/schedules/`

#### Real-time Updates (Server-Sent Events)
- SSE for live crawler progress streaming
- Connection lifecycle: 10-minute timeout, heartbeat pattern
- Automatic cleanup of inactive connections
- Location: `lib/eventBroadcaster.ts`, `lib/sseClient.ts`

#### Alert System
- Condition-based notifications (price, area, trade type)
- Multi-channel delivery: Browser, Email, Webhook
- Execution during crawling: Checks new articles against alert rules
- Location: `app/api/alerts/`, database Alert model

#### Analytics Engine
- Dashboard API: Market overview KPIs, price trends (30d), rankings
- Real-price integration: Government transaction data API
- Performance optimization: Numeric price columns (BigInt) for fast sorting
- Location: `app/api/analytics/`, `lib/real-price-api.ts`

#### Real-Price Data System (Government API Integration)
- **Two separate APIs** with different implementations:
  - `/api/real-price`: Standalone real-price page (uses `MOLIT_SERVICE_KEY`)
  - `/api/real-price/complex`: Complex detail page integration (uses `PUBLIC_DATA_SERVICE_KEY`)
- **Caching strategy**: PostgreSQL-based (30-day TTL), not Redis
  - Table: `real_price_cache` (via Prisma model `RealPriceCache`)
  - Stores entire region data (all apartments for lawdCd+dealYmd combination)
  - Single cache entry can contain 500+ apartment records
- **Name matching**: Fuzzy bidirectional matching to handle variations
  - Example: "향촌현대5차" matches "향촌마을현대5차"
  - Minimum length: 4 characters to prevent over-matching
- **Geocoding integration**: Kakao Reverse Geocoding API
  - Converts coordinates to lawdCd (법정동코드, 5-digit legal district code)
  - Handles complex administrative divisions (e.g., "안양시 동안구")
  - Location: `lib/dong-code.ts`, `lib/kakao-geocode.ts`
- **Key files**:
  - `app/api/real-price/complex/route.ts` - Complex detail integration
  - `lib/real-price-api.ts` - Government API client
  - `lib/real-price-cache.ts` - PostgreSQL cache layer
  - `lib/dong-code.ts` - Legal district code mapping

### Database Schema Highlights

**Core Models** (see `prisma/schema.prisma`):
- `Complex`: Building complex metadata (name, location, geocoded address)
- `Article`: Individual listings with dual price columns (string + BigInt)
- `CrawlHistory`: Execution logs with progress tracking fields
- `Favorite`: User bookmarks for complexes
- `Alert`: Notification rules with condition logic
- `Schedule`: Cron jobs with dynamic/static modes
- `Group`: Custom complex grouping (auto-rules supported)

**Performance Indexes**:
- Composite indexes for common query patterns (e.g., `[complexId, createdAt]`)
- Numeric price indexes for fast filtering/sorting
- Covering indexes to avoid table lookups

### Critical Integration Points

**Next.js ↔ Python Crawler**:
- Next.js API calls Python subprocess via `child_process.spawn()`
- Python writes progress updates to database
- Next.js streams updates via SSE using database polling
- Shared file system for JSON/CSV output

**Frontend ↔ API**:
- Server Components fetch directly from Prisma (no client-side API calls)
- Client Components use React Query for API mutations
- Real-time updates via SSE connections

**Caching Flow**:
1. Request → Check L1 (memory)
2. L1 miss → Check L2 (Redis)
3. L2 miss → Fetch from DB → Write to L2 & L1
4. Invalidation: Pattern-based deletion on writes

## Development Practices

### Code Patterns

**API Route Structure** (`app/api/*/route.ts`):
```typescript
// Use standardized response helpers
import { apiResponse, apiError } from '@/lib/api-response';

// Always validate with Zod schemas
import { z } from 'zod';
const schema = z.object({ ... });

// Return consistent API format
return apiResponse(data, 'Success message', 200);
return apiError('Error message', 400);
```

**Database Queries**:
```typescript
// Use Prisma include for N+1 prevention
const complexes = await prisma.complex.findMany({
  include: {
    articles: true,  // ✅ Single query
    favorites: true,
  }
});

// Leverage numeric price columns for performance
where: {
  dealOrWarrantPrcWon: { gte: minPrice, lte: maxPrice }
}
```

**Caching Pattern**:
```typescript
import { getCached, CacheKeys, CacheTTL } from '@/lib/redis-cache';

const data = await getCached(
  CacheKeys.complex.list(userId, params),
  CacheTTL.medium,
  async () => await prisma.complex.findMany({ ... })
);
```

**Error Handling**:
```typescript
// Use custom ApiError class
import { ApiError } from '@/lib/api-error';

if (!resource) {
  throw new ApiError('Resource not found', 404, 'NOT_FOUND');
}
```

### File Organization

**API Routes** (`app/api/`):
- Each feature has its own directory with `route.ts`
- Dynamic routes use `[param]/route.ts`
- Shared logic extracted to `lib/` utilities

**Components** (`components/`):
- No nested directories - all flat for easy discovery
- Naming: PascalCase, descriptive (e.g., `CrawlerHistory.tsx`)
- Shared UI primitives: `BaseModal.tsx`, `LoadingSpinner.tsx`, `EmptyState.tsx`

**Library Code** (`lib/`):
- Single-responsibility modules (auth, cache, logger, etc.)
- Export utilities, not classes when possible
- Type definitions in same file or `types/` directory

### Critical Constraints

1. **Development Mode Policy**: Do NOT change `docker-compose.dev.yml` to production mode. Hot reload is intentional for fast NAS deployment.

2. **Database Location**: Database runs in Docker on NAS. Never attempt local database connections or searches outside the containerized environment.

3. **TypeScript Strict Mode**: `tsconfig.json` has `strict: true`. All code must pass strict type checking. Use `npm run type-check` before committing.

4. **Crawler Performance**: The Python crawler is optimized for 4min 12sec (5 complexes). Changes to scroll timing or wait intervals must maintain bot-detection avoidance (see `docs/PERFORMANCE.md`).

5. **Redis Dependency**: Application degrades gracefully without Redis (cache misses fallback to DB), but performance suffers. Ensure Redis is running for production-like testing.

6. **Session Isolation**: Test/production environments use separate `NEXTAUTH_SECRET` values to prevent session conflicts. Never share secrets across environments.

## Testing Strategy

**Test Structure**:
- Tests in `__tests__/` directory mirroring `app/` structure
- Vitest config: `vitest.config.ts` (jsdom environment)
- Coverage threshold: Not enforced, but aim for critical paths

**Running Tests**:
```bash
npm test                    # All tests
vitest --ui                 # Interactive UI
vitest --coverage           # Coverage report
```

**Test Patterns**:
- Mock Prisma with `vi.mock('@/lib/prisma')`
- Use `@testing-library/react` for component tests
- API tests should mock database calls

## Performance Optimization

**Crawler Performance** (v1.1.0 - 51.3% faster):
- Optimized scroll distance: 800px (was 500px)
- Dynamic wait times: 0.3s/1.0s based on API patterns
- Fast exit condition: 3 consecutive empties (was 8)
- Metrics: 0.99 articles/sec, 4min 12sec for 5 complexes

**Database Performance**:
- Numeric price columns for fast sorting (BigInt vs String)
- Composite indexes for common queries
- N+1 query elimination via Prisma `include`

**Caching Performance**:
- L1 (memory): 60s TTL, instant access
- L2 (Redis): 5min-30min TTL, <5ms latency
- Cache hit rate target: >80% for complex lists

## Common Troubleshooting

**Crawler stops at 20 articles**:
- Check scroll logs: `docker-compose logs web | grep "스크롤"`
- Verify `scrollHeight` changes in debug output
- Ensure localStorage "sameAddressGroup" is set

**Type errors after Prisma schema change**:
- Run `npx prisma generate` to regenerate client
- Restart TypeScript server in IDE
- Clear `.next` directory if stale types persist

**SSE connection timeout**:
- Check Redis connection (SSE uses Redis for state)
- Verify 10-minute timeout in `lib/sseClient.ts`
- Look for "SSE cleanup" logs

**Session issues**:
- Verify `NEXTAUTH_SECRET` is set in `config.env`
- Check session cookie name doesn't conflict with other apps
- Clear browser cookies if switching between test/prod

**Redis connection failures**:
- Application continues without cache (degraded performance)
- Check `docker-compose logs redis`
- Verify `REDIS_URL=redis://redis:6379` in environment

**Real-price data not showing / cache issues**:
- Real-price data is cached in **PostgreSQL** (not Redis) in the `real_price_cache` table
- Cache TTL: 30 days (see `RealPriceCache` model in `prisma/schema.prisma`)
- To clear cache for specific region:
  ```bash
  docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler -c "DELETE FROM real_price_cache WHERE \"lawdCd\" = '41173';"
  ```
- To clear all real-price cache:
  ```bash
  docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler -c "DELETE FROM real_price_cache;"
  ```
- Note: Prisma model name is `RealPriceCache` but actual table name is `real_price_cache` (mapped via `@@map()`)
- Cache stores entire region data (e.g., all apartments in 동안구), not individual apartments
- Apartment name matching uses fuzzy logic (bidirectional includes) to handle variations

## Key Files Reference

- **Main Application**: `app/page.tsx` (dashboard overview)
- **Crawler Entry**: `logic/nas_playwright_crawler.py`
- **Database Schema**: `prisma/schema.prisma`
- **Auth Config**: `lib/auth.ts`
- **API Standards**: `lib/api-response.ts`, `lib/api-error.ts`
- **Caching Logic**: `lib/redis-cache.ts`
- **Scheduler**: `lib/scheduler.ts`
- **Real-Price System**:
  - `lib/real-price-api.ts` (Government API client)
  - `lib/real-price-cache.ts` (PostgreSQL cache layer)
  - `lib/dong-code.ts` (Legal district code mapping)
  - `lib/kakao-geocode.ts` (Reverse geocoding)
  - `app/api/real-price/complex/route.ts` (Complex detail API)
- **Environment Variables**: `config.env` (실제 값, Git 무시), `config.env.example` (템플릿)
- **Type Definitions**: `types/` directory (if exists) or inline in lib files

## Environment Variable Management

**중요:** 이 프로젝트는 `config.env` 단일 파일로 환경 변수를 관리합니다.

### 파일 구조
- `.env` → `config.env`의 심볼릭 링크 (Next.js 자동 로드용)
- `config.env` → 실제 환경 변수 파일 (Git 무시)
- `config.env.example` → 템플릿 (Git 추적)

### 로딩 방식
1. **Next.js (로컬 개발)**: `.env` 자동 로드 → 실제로는 `config.env` 읽음
2. **Docker Compose**: `env_file: - config.env` 명시적 로드
3. **Python 크롤러**: `load_dotenv()` → `.env` (→ `config.env`) 로드

### 초기 설정
```bash
cp config.env.example config.env
vi config.env  # 실제 API 키 입력
ls -lah .env   # 심볼릭 링크 확인: .env -> config.env
```

**상세 가이드**: [docs/ENV_SETUP.md](docs/ENV_SETUP.md)

## Documentation

- **Getting Started**: `docs/GETTING_STARTED.md`
- **Environment Setup**: `docs/ENV_SETUP.md` - 환경 변수 관리 가이드 ⭐
- **NAS Setup**: `docs/NAS_SETUP.md` - NAS 배포 가이드 (Docker Compose V2)
- **Performance Guide**: `docs/PERFORMANCE.md`
- **Deployment**: `docs/DEPLOYMENT.md`
- **Site Map**: `SITEMAP.md` (all pages and API routes)
- **TODO Roadmap**: `TODO.md`
- **Changelog**: `CHANGELOG.md`
- **Security**: `SECURITY.md` - 보안 가이드
