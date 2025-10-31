# Console.log → Logger 마이그레이션 가이드

> 이 문서는 프로젝트 전체의 console.log를 구조화된 Logger로 마이그레이션하기 위한 가이드입니다.

## 현황

**전체 현황** (2025-01-31 기준):
- 총 파일 수: 127개
- 총 console 문: 597개
- 완료: 14개 (lib/db-cache.ts)
- 남은 작업: 583개

**주요 파일별 console 사용 현황**:
| 파일 | console 개수 | 우선순위 |
|------|------------|----------|
| lib/scheduler.ts | 77 | 높음 |
| app/complexes/page.tsx | 27 | 중간 |
| app/api/crawl/route.ts | 27 | 높음 |
| app/api/complex-info/route.ts | 22 | 중간 |
| app/api/geocode/route.ts | 20 | 중간 |
| lib/sseClient.ts | 14 | 높음 |
| lib/db-cache.ts | ~~14~~ ✅ 0 | 완료 |
| lib/redis-cache.ts | 12 | 높음 |
| lib/dong-code.ts | 11 | 낮음 |

## Logger 사용법

### 1. Logger Import 및 생성

```typescript
import { createLogger } from '@/lib/logger';

// 파일 상단에서 로거 생성
const logger = createLogger('DOMAIN_NAME');  // 예: 'CRAWL', 'CACHE', 'AUTH'
```

### 2. 마이그레이션 패턴

#### 패턴 1: console.log → logger.info/debug

**Before**:
```typescript
console.log('[Cache] HIT:', key);
console.log(`User ${userId} logged in`);
```

**After**:
```typescript
logger.debug('Cache HIT', { key });
logger.info('User logged in', { userId });
```

**규칙**:
- 개발 디버깅용 → `logger.debug()`
- 일반 정보성 로그 → `logger.info()`
- 메시지에서 prefix 제거 (logger가 자동으로 추가)
- 변수는 context 객체로 전달

#### 패턴 2: console.error → logger.error

**Before**:
```typescript
console.error('Failed to fetch data:', error);
console.error('[DB] Query failed:', error.message);
```

**After**:
```typescript
logger.error('Failed to fetch data', { error });
logger.error('Query failed', { error });
```

**규칙**:
- 에러 객체는 `{ error }` 형태로 전달
- logger가 자동으로 error.message와 stack trace 파싱
- prefix는 createLogger()로 설정된 domain 사용

#### 패턴 3: console.warn → logger.warn

**Before**:
```typescript
console.warn('Deprecated API usage');
console.warn(`Retry attempt ${attempt}/3`);
```

**After**:
```typescript
logger.warn('Deprecated API usage');
logger.warn('Retry attempt', { attempt, maxAttempts: 3 });
```

#### 패턴 4: 복잡한 로그 메시지

**Before**:
```typescript
console.log(`[Real Price Cache] HIT: ${lawdCd}-${dealYmd} (${cache.totalCount} items, cached ${Math.floor((Date.now() - cache.createdAt.getTime()) / 1000 / 60)} minutes ago)`);
```

**After**:
```typescript
logger.debug('Real Price Cache HIT', {
  lawdCd,
  dealYmd,
  totalCount: cache.totalCount,
  cachedMinutesAgo: Math.floor((Date.now() - cache.createdAt.getTime()) / 1000 / 60)
});
```

**규칙**:
- 계산된 값은 변수로 추출하거나 context에 포함
- 메시지는 간결하게 유지
- 세부 정보는 context 객체로 전달

### 3. Logger 레벨 선택 가이드

| 로그 레벨 | 사용 시점 | 예시 |
|----------|----------|------|
| `debug` | 개발 디버깅, 상세한 흐름 추적 | 캐시 HIT/MISS, DB 쿼리 |
| `info` | 주요 이벤트, 상태 변화 | 크롤링 시작/완료, 사용자 로그인 |
| `warn` | 경고 (에러는 아니지만 주의 필요) | Deprecated API, 재시도 시도 |
| `error` | 에러 발생 | API 실패, DB 연결 실패 |

### 4. 도메인명 컨벤션

**도메인명 작성 규칙**:
- 대문자 사용 (예: `CRAWL`, `AUTH`, `CACHE`)
- 파일/기능 단위로 구분 (예: `DB_CACHE`, `REAL_PRICE_API`)
- 하위 도메인은 콜론으로 구분 (예: `CRAWL:SCHEDULER`)

**예시**:
```typescript
// lib/scheduler.ts
const logger = createLogger('SCHEDULER');

// app/api/crawl/route.ts
const logger = createLogger('CRAWL');

// lib/real-price-cache.ts
const logger = createLogger('REAL_PRICE_CACHE');

// 하위 로거 (선택사항)
const dbLogger = logger.child('DB');  // 'CRAWL:DB'
```

## 마이그레이션 작업 순서

### Phase 1: 핵심 인프라 (우선순위 높음)
- [x] lib/db-cache.ts (14개) ✅ 완료
- [ ] lib/redis-cache.ts (12개)
- [ ] lib/scheduler.ts (77개)
- [ ] lib/sseClient.ts (14개)

### Phase 2: 주요 API 라우트 (우선순위 중간)
- [ ] app/api/crawl/route.ts (27개)
- [ ] app/api/complex-info/route.ts (22개)
- [ ] app/api/geocode/route.ts (20개)
- [ ] app/api/real-price/route.ts (16개)

### Phase 3: 페이지 컴포넌트 (우선순위 낮음)
- [ ] app/complexes/page.tsx (27개)
- [ ] app/complex/[complexNo]/page.tsx (14개)
- [ ] app/community/[id]/page.tsx (14개)

### Phase 4: 나머지 파일들 (100+ 파일)
- [ ] 자동화 스크립트 작성 고려

## 마이그레이션 체크리스트

파일별 작업 시 다음 순서로 진행:

- [ ] 1. 파일 상단에 logger import 추가
- [ ] 2. createLogger()로 로거 인스턴스 생성
- [ ] 3. console.log → logger.debug/info 변환
- [ ] 4. console.error → logger.error 변환
- [ ] 5. console.warn → logger.warn 변환
- [ ] 6. 타입 체크 (`npx tsc --noEmit <파일명>`)
- [ ] 7. 커밋 메시지 작성 (예: `refactor(logger): migrate console.log to logger in <파일명>`)

## 자동화 고려사항

597개의 console 문을 수동으로 마이그레이션하는 것은 비효율적입니다. 다음 방법을 고려:

### 방법 1: AST 기반 자동 변환 (추천)
- jscodeshift 또는 ts-morph 사용
- console.log/error/warn을 자동으로 logger 호출로 변환
- 복잡한 로직은 수동으로 검토

### 방법 2: ESLint 규칙 추가
```javascript
// .eslintrc.js
rules: {
  'no-console': ['warn', { allow: ['error'] }],  // console.error는 임시 허용
}
```

### 방법 3: 점진적 마이그레이션
- 새 코드부터 logger 사용 강제
- 기존 코드는 수정 시 함께 변경
- 6개월~1년 계획으로 완료

## 예제: lib/db-cache.ts 마이그레이션

### Before (14 console statements)
```typescript
import { prisma } from './prisma';

// ...

if (!cache) {
  console.log(`[Real Price Cache] MISS: ${lawdCd}-${dealYmd}`);
  return null;
}

console.log(`[Real Price Cache] HIT: ${lawdCd}-${dealYmd} (${cache.totalCount} items)`);

try {
  // ...
} catch (error) {
  console.error('[Real Price Cache] Read error:', error.message);
}
```

### After (0 console statements)
```typescript
import { prisma } from './prisma';
import { createLogger } from './logger';

const logger = createLogger('DB_CACHE');

// ...

if (!cache) {
  logger.debug('Real Price Cache MISS', { lawdCd, dealYmd });
  return null;
}

logger.debug('Real Price Cache HIT', {
  lawdCd,
  dealYmd,
  totalCount: cache.totalCount
});

try {
  // ...
} catch (error) {
  logger.error('Real Price Cache Read error', { error, lawdCd, dealYmd });
}
```

**개선사항**:
- ✅ 구조화된 로그 (JSON 포맷)
- ✅ 일관된 prefix (`[DB_CACHE]`)
- ✅ Context 객체로 변수 전달 (디버깅 용이)
- ✅ 로그 레벨 제어 가능 (환경변수 `LOG_LEVEL`)
- ✅ 파일 로그 자동 저장 (프로덕션)

## 참고 자료

- Logger 구현: `lib/logger.ts`
- Logger 사용 예시: `lib/db-cache.ts`
- 프로젝트 문서: `CLAUDE.md`
