# 테스트 가이드 (Testing Guide)

v2.11.0부터 프로젝트에 테스트가 추가되었습니다. 이 문서는 테스트 파일 사용법을 설명합니다.

---

## 📋 목차

1. [테스트 구조](#테스트-구조)
2. [테스트 실행 방법](#테스트-실행-방법)
3. [각 테스트 파일 설명](#각-테스트-파일-설명)
4. [언제 테스트를 실행해야 하나](#언제-테스트를-실행해야-하나)
5. [새 테스트 추가하기](#새-테스트-추가하기)

---

## 테스트 구조

현재 **7개의 테스트 파일**이 있으며, 총 **74개의 테스트**가 포함되어 있습니다.

```
__tests__/
├── api/
│   └── health.test.ts        # Health check API 테스트 (6 tests)
└── lib/
    ├── api-error.test.ts     # API 에러 클래스 테스트 (16 tests)
    ├── api-response.test.ts  # API 응답 헬퍼 테스트 (10 tests)
    ├── logger.test.ts        # 로거 유틸 테스트 (10 tests)
    ├── price-utils.test.ts   # 가격 파싱 유틸 테스트 (16 tests)
    ├── redis-cache.test.ts   # Redis 캐시 레이어 테스트 (7 tests)
    └── scheduler.test.ts     # 스케줄러 유틸 테스트 (9 tests)
```

**테스트 프레임워크**:
- **Vitest** - 빠른 단위 테스트 프레임워크 (Vite 기반)
- **@testing-library/react** - React 컴포넌트 테스트
- **jsdom** - 브라우저 환경 시뮬레이션

---

## 테스트 실행 방법

### 1. 모든 테스트 실행

```bash
npm test
```

**출력 예시**:
```
✓ __tests__/lib/api-error.test.ts  (16 tests) 5ms
✓ __tests__/lib/price-utils.test.ts  (16 tests) 7ms
✓ __tests__/lib/api-response.test.ts  (10 tests) 11ms
✓ __tests__/lib/logger.test.ts  (10 tests) 29ms
✓ __tests__/lib/scheduler.test.ts  (9 tests) 3ms
✓ __tests__/lib/redis-cache.test.ts  (7 tests) 2ms
✓ __tests__/api/health.test.ts  (6 tests) 10ms

Test Files  7 passed (7)
     Tests  74 passed (74)
  Start at  10:29:15
  Duration  914ms
```

### 2. Watch 모드 (파일 변경 시 자동 재실행)

```bash
npm test -- --watch
```

**특징**:
- 파일 수정하면 관련 테스트만 자동 재실행
- `h` 키로 도움말, `q` 키로 종료
- 개발 중 백그라운드에서 실행 유용

### 3. 특정 테스트 파일만 실행

```bash
# 파일명 키워드로 필터링
npm test -- price          # price-utils.test.ts만 실행
npm test -- api-response   # api-response.test.ts만 실행
npm test -- health         # health.test.ts만 실행
```

### 4. 커버리지 리포트 생성

```bash
npm run test:coverage
```

**출력 예시**:
```
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
lib/api-error.ts         | 100.00  | 100.00   | 100.00  | 100.00
lib/api-response.ts      | 92.31   | 85.71    | 100.00  | 92.31
lib/price-utils.ts       | 100.00  | 95.00    | 100.00  | 100.00
lib/redis-cache.ts       | 88.24   | 75.00    | 85.71   | 88.24
lib/scheduler.ts         | 90.00   | 80.00    | 100.00  | 90.00
```

### 5. UI 모드 (인터랙티브 테스트)

```bash
npx vitest --ui
```

브라우저에서 테스트 결과를 시각적으로 확인할 수 있습니다.

---

## 각 테스트 파일 설명

### 1. `__tests__/api/health.test.ts` (6 tests)

**테스트 대상**: [app/api/health/route.ts](../app/api/health/route.ts)

**테스트 내용**:
- ✅ Health check API 정상 응답 (200 OK)
- ✅ 데이터베이스 연결 상태 체크
- ✅ Redis 연결 상태 체크
- ✅ uptime 필드 포함 확인
- ✅ responseTime 필드 포함 확인
- ✅ 캐시 방지 헤더 설정 확인

**실행 예시**:
```bash
npm test -- health
```

**출력**:
```
✓ should return healthy status
✓ should include database check
✓ should include uptime
✓ should include responseTime
✓ should set no-cache headers
✓ should return 503 on database failure
```

---

### 2. `__tests__/lib/api-error.test.ts` (16 tests)

**테스트 대상**: [lib/api-error.ts](../lib/api-error.ts)

**테스트 내용**:
- ✅ ApiError 클래스 생성 (message, statusCode, errorCode)
- ✅ 기본 statusCode (400), errorCode (VALIDATION_ERROR)
- ✅ HTTP 상태 코드 (400, 401, 403, 404, 500)
- ✅ 에러 타입별 statusCode 검증
- ✅ toJSON() 메서드 테스트

**실행 예시**:
```bash
npm test -- api-error
```

**왜 중요한가**:
- API 에러 처리 일관성 보장
- 에러 코드 표준화 검증
- HTTP 상태 코드 정확성 확인

---

### 3. `__tests__/lib/api-response.test.ts` (10 tests)

**테스트 대상**: [lib/api-response.ts](../lib/api-response.ts)

**테스트 내용**:
- ✅ 성공 응답 생성 (200 OK)
- ✅ 에러 응답 생성 (400, 500)
- ✅ 페이지네이션 응답 (total, page, limit)
- ✅ 응답 필드 검증 (success, data, message, timestamp)
- ✅ ApiError 객체를 에러 응답으로 변환

**실행 예시**:
```bash
npm test -- api-response
```

**왜 중요한가**:
- API 응답 형식 일관성 보장
- 프론트엔드 타입 안정성 확보
- 페이지네이션 로직 검증

---

### 4. `__tests__/lib/logger.test.ts` (10 tests)

**테스트 대상**: [lib/logger.ts](../lib/logger.ts)

**테스트 내용**:
- ✅ 로그 레벨별 출력 (info, warn, error)
- ✅ 컨텍스트 데이터 포함 검증
- ✅ 타임스탬프 형식 검증 (KST)
- ✅ 로그 카테고리 분류 (API, CACHE, DB, CRON)
- ✅ JSON 포맷 검증

**실행 예시**:
```bash
npm test -- logger
```

**왜 중요한가**:
- 로그 포맷 일관성 보장
- 디버깅 효율성 향상
- 운영 모니터링 데이터 품질 확보

---

### 5. `__tests__/lib/price-utils.test.ts` (16 tests)

**테스트 대상**: [lib/price-utils.ts](../lib/price-utils.ts)

**테스트 내용**:
- ✅ 매매가 파싱 ("7억6,000" → 760000000n)
- ✅ 전월세 파싱 ("보증금 1억/월세 50" → {보증금: 100000000n, 월세: 500000n})
- ✅ BigInt 타입 변환
- ✅ 빈 값/null 처리
- ✅ 다양한 형식 지원 (공백 있음/없음)

**실행 예시**:
```bash
npm test -- price
```

**왜 중요한가**:
- **가격 데이터 정확성** - 가장 중요한 데이터!
- 정렬/필터 성능 보장 (BigInt 숫자 타입)
- 다양한 입력 형식 처리

**v2.11.0 버그 수정**:
```typescript
// Before: 잘못된 정규식
const manMatch = cleanStr.match(/억?([\d,]+)/);
// "7억6,000" → 700070000n (오류!)

// After: 수정된 정규식
const manMatch = cleanStr.match(/억([\d,]+)/);
// "7억6,000" → 760000000n (정확!)
```

---

### 6. `__tests__/lib/redis-cache.test.ts` (7 tests)

**테스트 대상**: [lib/redis-cache.ts](../lib/redis-cache.ts)

**테스트 내용**:
- ✅ L1 캐시 (메모리) 동작 검증
- ✅ L2 캐시 (Redis) 동작 검증
- ✅ TTL 만료 처리
- ✅ 캐시 무효화 (패턴 매칭)
- ✅ Redis 연결 실패 시 graceful degradation

**실행 예시**:
```bash
npm test -- redis-cache
```

**왜 중요한가**:
- **성능 최적화** - 80% 이상 캐시 적중률 목표
- L1/L2 계층 구조 검증
- Redis 장애 시 안정성 확보

**v2.11.0 개선**:
- `KEYS` → `SCAN` 마이그레이션 (non-blocking)
- 프로덕션 환경 안정성 향상

---

### 7. `__tests__/lib/scheduler.test.ts` (9 tests)

**테스트 대상**: [lib/scheduler.ts](../lib/scheduler.ts)

**테스트 내용**:
- ✅ Cron 표현식 검증
- ✅ 다음 실행 시간 계산
- ✅ 타임존 처리 (KST)
- ✅ 잘못된 cron 표현식 에러 핸들링
- ✅ Schedule 타입 변환 (DB → Scheduler)

**실행 예시**:
```bash
npm test -- scheduler
```

**왜 중요한가**:
- 자동 크롤링 스케줄 정확성 보장
- Cron 표현식 파싱 검증
- 타임존 이슈 방지 (KST vs UTC)

---

## 언제 테스트를 실행해야 하나

### 1. 코드 수정 후 커밋 전 (필수!)

```bash
# TypeScript 타입 체크
npm run type-check

# 린트 검사
npm run lint

# 테스트 실행
npm test
```

**모두 통과해야 커밋!**

### 2. `lib/` 파일 수정 시 (강력 권장)

```bash
# 예: lib/price-utils.ts 수정 후
npm test -- price

# 예: lib/redis-cache.ts 수정 후
npm test -- redis-cache
```

**Watch 모드 사용 권장**:
```bash
npm test -- --watch
# 백그라운드에서 실행하고 코드 수정하면서 작업
```

### 3. API 라우트 수정 시

```bash
# 예: app/api/health/route.ts 수정 후
npm test -- health
```

### 4. 프로덕션 배포 전 (필수!)

```bash
# 전체 테스트 + 커버리지 확인
npm run test:coverage

# 빌드 테스트
npm run build
```

### 5. 새 기능 개발 후

새로운 유틸 함수나 API를 추가했다면, 테스트도 함께 추가하세요!

---

## 새 테스트 추가하기

### 기본 패턴

```typescript
// __tests__/lib/my-util.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-util';

describe('myFunction', () => {
  it('should return correct result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle null input', () => {
    const result = myFunction(null);
    expect(result).toBeNull();
  });
});
```

### Prisma Mock 패턴

```typescript
import { vi } from 'vitest';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    complex: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

it('should fetch complexes', async () => {
  prisma.complex.findMany.mockResolvedValue([
    { id: 1, complexName: 'Test' }
  ]);

  const result = await getComplexes();
  expect(result).toHaveLength(1);
});
```

### API 라우트 테스트 패턴

```typescript
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/my-route/route';

it('should return 200 OK', async () => {
  const request = new NextRequest('http://localhost:3000/api/my-route');
  const response = await GET(request);

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
});
```

---

## 테스트 실패 시 대처 방법

### 1. 에러 메시지 확인

```
FAIL  __tests__/lib/price-utils.test.ts
  ❯ should parse "7억6,000" to 760000000n
    → expected 700070000n to be 760000000n
```

**의미**: 기대값 760000000n이지만 실제 700070000n이 반환됨 → 가격 파싱 로직 버그!

### 2. 스택 트레이스 확인

```
 ❯ __tests__/lib/price-utils.test.ts:12:48
     10|     it('should parse "7억6,000" to 760000000n', () => {
     11|       // 공백 없는 형식: "7억6,000"
     12|       expect(parsePriceToWonBigInt('7억6,000')).toBe(760000000n);
       |                                                ^
     13|     });
```

**의미**: [price-utils.test.ts:12](../__tests__/lib/price-utils.test.ts#L12)에서 실패

### 3. 해당 코드 수정

[lib/price-utils.ts](../lib/price-utils.ts) 파일 열어서 버그 수정:

```typescript
// Before
const manMatch = cleanStr.match(/억?([\d,]+)/);

// After
const manMatch = cleanStr.match(/억([\d,]+)/);
```

### 4. 재실행

```bash
npm test -- price
```

**출력**:
```
✓ __tests__/lib/price-utils.test.ts  (16 tests) 2ms
```

성공!

---

## 테스트 설정 파일

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',  // 브라우저 환경 시뮬레이션
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),  // @ alias 지원
    },
  },
});
```

### `vitest.setup.ts`

```typescript
// 글로벌 테스트 설정
import { vi } from 'vitest';

// Mock 환경 변수
process.env.DATABASE_URL = 'mock-db-url';
process.env.NEXTAUTH_SECRET = 'test-secret';
```

---

## 참고 문서

- **Vitest 공식 문서**: https://vitest.dev/
- **Testing Library**: https://testing-library.com/
- **프로젝트 아키텍처**: [CLAUDE.md](../CLAUDE.md)
- **스크립트 가이드**: [SCRIPTS_GUIDE.md](./SCRIPTS_GUIDE.md)

---

## 요약

| 명령어 | 용도 | 언제 사용 |
|--------|------|-----------|
| `npm test` | 모든 테스트 실행 | 커밋 전, 배포 전 |
| `npm test -- --watch` | Watch 모드 | 개발 중 |
| `npm test -- price` | 특정 테스트만 실행 | 특정 파일 수정 시 |
| `npm run test:coverage` | 커버리지 리포트 | 코드 품질 확인 |
| `npx vitest --ui` | UI 모드 | 인터랙티브 디버깅 |

**핵심 규칙**:
1. 코드 수정 후 테스트 실행 (필수!)
2. 테스트 실패 시 커밋하지 않기
3. 새 기능 추가 시 테스트도 함께 추가
4. `lib/` 파일 수정 시 관련 테스트 확인

**Made with ❤️ for production-ready code**
