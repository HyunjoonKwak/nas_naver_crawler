# API 에러 핸들링 래퍼 마이그레이션 가이드

> 이 문서는 API 라우트의 try-catch 보일러플레이트를 `ApiResponseHelper.handler`로 마이그레이션하기 위한 가이드입니다.

## 현황

**전체 현황** (2025-01-31 기준):
- 총 API 라우트: 77개
- 총 try-catch 블록: 168개
- 완료: 1개 (app/api/crawl-history/route.ts)
- 남은 작업: 76개 라우트

## ApiResponseHelper 기능

### 1. 자동 에러 처리
- try-catch 보일러플레이트 제거
- 에러 타입별 자동 분류 및 로깅
- 일관된 에러 응답 포맷

### 2. 요청 추적
- 자동 requestId 생성
- 요청 시작/완료 로그
- 요청 소요 시간 측정

### 3. 개발/프로덕션 환경 분리
- 개발: 상세 에러 정보 노출
- 프로덕션: 민감한 정보 숨김

## 마이그레이션 패턴

### 패턴 1: 기본 GET 핸들러

**Before** (38줄):
```typescript
export async function GET() {
  try {
    const currentUser = await requireAuth();

    const data = await prisma.model.findMany({
      where: { userId: currentUser.id }
    });

    return NextResponse.json({
      data,
      total: data.length,
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
```

**After** (28줄, -10줄):
```typescript
import { ApiResponseHelper } from '@/lib/api-response';

export const GET = ApiResponseHelper.handler(async () => {
  const currentUser = await requireAuth();

  const data = await prisma.model.findMany({
    where: { userId: currentUser.id }
  });

  return ApiResponseHelper.success({
    data,
    total: data.length,
  });
});
```

**변경사항**:
- ✅ try-catch 제거 (자동 처리)
- ✅ console.error 제거 (자동 로깅)
- ✅ 에러 응답 제거 (자동 생성)
- ✅ 10줄 감소 (26% 코드 감소)

### 패턴 2: POST 핸들러 with Validation

**Before**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: '이름이 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await createSomething(body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Create error:', error);
    return NextResponse.json(
      { error: '생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

**After**:
```typescript
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiErrors } from '@/lib/api-error';

export const POST = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const body = await request.json();

  if (!body.name) {
    throw ApiErrors.validation('이름이 필요합니다.', { field: 'name' });
  }

  const result = await createSomething(body);

  return ApiResponseHelper.success(result, '생성 완료');
});
```

**변경사항**:
- ✅ throw ApiErrors로 검증 에러 처리
- ✅ 에러 타입 자동 분류 (VALIDATION_ERROR)
- ✅ 상태 코드 자동 설정 (400)

### 패턴 3: DELETE 핸들러 with 404 처리

**Before**:
```typescript
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const item = await prisma.model.findUnique({
      where: { id, userId: currentUser.id }
    });

    if (!item) {
      return NextResponse.json(
        { error: '항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await prisma.model.delete({ where: { id } });

    return NextResponse.json({ message: '삭제 완료' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

**After**:
```typescript
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiErrors } from '@/lib/api-error';

export const DELETE = ApiResponseHelper.handler(async (request: NextRequest) => {
  const currentUser = await requireAuth();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const item = await prisma.model.findUnique({
    where: { id, userId: currentUser.id }
  });

  if (!item) {
    throw ApiErrors.notFound('항목');
  }

  await prisma.model.delete({ where: { id } });

  return ApiResponseHelper.success(null, '삭제 완료');
});
```

**변경사항**:
- ✅ throw ApiErrors.notFound로 404 처리
- ✅ 에러 타입 자동 분류 (NOT_FOUND)
- ✅ 상태 코드 자동 설정 (404)

## ApiErrors 헬퍼 함수

| 함수 | 사용 시점 | 상태 코드 |
|------|----------|----------|
| `ApiErrors.validation(msg, details)` | 입력 검증 실패 | 400 |
| `ApiErrors.authentication(msg)` | 로그인 필요 | 401 |
| `ApiErrors.authorization(msg)` | 권한 부족 | 403 |
| `ApiErrors.notFound(resource)` | 리소스 없음 | 404 |
| `ApiErrors.rateLimit(msg)` | Rate Limit 초과 | 429 |
| `ApiErrors.internal(msg, details)` | 서버 내부 오류 | 500 |
| `ApiErrors.externalApi(service, err)` | 외부 API 실패 | 502 |
| `ApiErrors.database(op, err)` | DB 작업 실패 | 500 |

## 마이그레이션 체크리스트

파일별 작업 시 다음 순서로 진행:

- [ ] 1. `import { ApiResponseHelper } from '@/lib/api-response';` 추가
- [ ] 2. 에러 처리 필요 시 `import { ApiErrors } from '@/lib/api-error';` 추가
- [ ] 3. `export async function GET()` → `export const GET = ApiResponseHelper.handler(async () =>`
- [ ] 4. try-catch 블록 제거
- [ ] 5. `NextResponse.json()` → `ApiResponseHelper.success()`
- [ ] 6. 에러 응답 → `throw ApiErrors.xxx()`
- [ ] 7. console.error 제거 (자동 로깅)
- [ ] 8. 타입 체크 (`npx tsc --noEmit <파일명>`)
- [ ] 9. 테스트 (API 호출 확인)

## 예제: app/api/crawl-history/route.ts

### Before (38줄)
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

    const history = await prisma.crawlHistory.findMany({
      where: { userId: { in: accessibleUserIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      history,
      total: history.length,
    });
  } catch (error: any) {
    console.error('Error fetching crawl history:', error);
    return NextResponse.json(
      { error: '크롤링 히스토리 조회 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
```

### After (28줄, -10줄)
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAccessibleUserIds } from '@/lib/auth-utils';
import { ApiResponseHelper } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export const GET = ApiResponseHelper.handler(async () => {
  const current User = await requireAuth();
  const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

  const history = await prisma.crawlHistory.findMany({
    where: { userId: { in: accessibleUserIds } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return ApiResponseHelper.success({
    history,
    total: history.length,
  });
});
```

**개선사항**:
- ✅ 10줄 감소 (26% 코드 감소)
- ✅ try-catch 보일러플레이트 제거
- ✅ 자동 requestId 추가 (디버깅 용이)
- ✅ 자동 로깅 (요청 시작/완료/실패)
- ✅ 일관된 에러 응답 포맷

## 작업 우선순위

### Phase 1: 간단한 CRUD API (우선순위 높음)
- [ ] app/api/crawl-history/route.ts ✅ 완료
- [ ] app/api/activities/route.ts
- [ ] app/api/events/route.ts
- [ ] app/api/crawl-status/route.ts

### Phase 2: 중간 복잡도 API
- [ ] app/api/users/route.ts
- [ ] app/api/groups/route.ts
- [ ] app/api/favorites/route.ts
- [ ] app/api/alerts/route.ts

### Phase 3: 복잡한 API
- [ ] app/api/complexes/route.ts
- [ ] app/api/crawl/route.ts
- [ ] app/api/real-price/route.ts

## 자동화 고려사항

### 방법 1: AST 기반 자동 변환
- jscodeshift 사용
- try-catch 패턴 자동 감지
- ApiResponseHelper.handler로 래핑

### 방법 2: ESLint 규칙
```javascript
// .eslintrc.js
rules: {
  'prefer-api-handler': 'warn',  // 커스텀 규칙
}
```

### 방법 3: 점진적 마이그레이션
- 새 API는 무조건 ApiResponseHelper 사용
- 기존 API는 수정 시 함께 변경
- 3-6개월 계획으로 완료

## 참고 자료

- ApiResponseHelper 구현: `lib/api-response.ts`
- ApiError 정의: `lib/api-error.ts`
- 예제: `app/api/crawl-history/route.ts`
