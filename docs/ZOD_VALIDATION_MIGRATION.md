# Zod 입력 검증 마이그레이션 가이드

> 이 문서는 API 라우트의 수동 입력 검증을 Zod 스키마 검증으로 마이그레이션하기 위한 가이드입니다.

## 현황

**전체 현황** (2025-01-31 기준):
- 총 API 라우트: 77개
- POST/PUT/PATCH 핸들러: 49개
- 완료: 4개 (register, posts, comments, alerts)
- 남은 작업: 45개 핸들러

**주요 검증 누락 API**:
| API 경로 | 핸들러 | 우선순위 |
|---------|--------|---------|
| /api/schedules | POST, PUT | 높음 |
| /api/favorites | POST | 중간 |
| /api/groups | POST, PUT | 중간 |
| /api/auth/reset-password | POST | 높음 |
| /api/user/change-password | POST | 높음 |

## Zod 검증의 장점

### 1. 타입 안전성
- 런타임 검증 + 컴파일 타임 타입 추론
- `z.infer<typeof schema>`로 자동 타입 생성
- 수동 타입 정의 불필요

### 2. 자동 에러 메시지
- 한글 에러 메시지 미리 정의
- 일관된 검증 에러 응답 포맷
- 프론트엔드에서 파싱하기 쉬운 구조

### 3. 복잡한 검증 로직
- `.refine()`으로 커스텀 검증
- 필드 간 의존성 검증 (예: minPrice <= maxPrice)
- 조건부 필수 필드 (예: webhookUrl required if notifyWebhook)

## 마이그레이션 패턴

### 패턴 1: POST 핸들러 (기본 필드 검증)

**Before** (수동 검증, 23줄):
```typescript
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

    const { complexNo, complexName } = body;

    if (!complexNo) {
      return NextResponse.json(
        { error: '단지번호가 필요합니다.' },
        { status: 400 }
      );
    }

    const favorite = await prisma.favorite.create({
      data: {
        complexNo,
        complexName: complexName || '',
        userId: currentUser.id,
      },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**After** (Zod 검증, 19줄, -4줄):
```typescript
import { validateRequest } from '@/lib/validation';
import { createFavoriteSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // Zod 스키마로 입력 검증
    const validation = await validateRequest(request, createFavoriteSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { complexNo, complexName } = validation.data;

    const favorite = await prisma.favorite.create({
      data: {
        complexNo,
        complexName: complexName || '',
        userId: currentUser.id,
      },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**개선사항**:
- ✅ 수동 if 문 제거
- ✅ 타입 안전성 확보 (validation.data는 타입 추론됨)
- ✅ 일관된 에러 응답
- ✅ 에러 메시지 중앙 관리

### 패턴 2: POST 핸들러 (복잡한 검증 로직)

**Before** (수동 검증, 40줄):
```typescript
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

    const {
      name,
      complexIds,
      tradeTypes,
      minPrice,
      maxPrice,
      notifyWebhook,
      webhookUrl,
    } = body;

    // 필수 필드 검증
    if (!name || !complexIds || complexIds.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one complex are required' },
        { status: 400 }
      );
    }

    // 조건부 필수 필드
    if (notifyWebhook && !webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required when webhook notification is enabled' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        name,
        complexIds,
        tradeTypes: tradeTypes || [],
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        notifyWebhook: notifyWebhook || false,
        webhookUrl: webhookUrl || null,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**After** (Zod 검증, 26줄, -14줄):
```typescript
import { validateRequest } from '@/lib/validation';
import { createAlertSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // Zod 스키마로 입력 검증 (복잡한 로직도 자동 처리)
    const validation = await validateRequest(request, createAlertSchema);
    if (!validation.success) {
      return validation.response;
    }

    const {
      name,
      complexIds,
      tradeTypes,
      minPrice,
      maxPrice,
      notifyWebhook,
      webhookUrl,
    } = validation.data;

    const alert = await prisma.alert.create({
      data: {
        name,
        complexIds,
        tradeTypes,        // 이미 기본값 []로 설정됨
        minPrice,          // 이미 null 처리됨
        maxPrice,
        notifyWebhook,     // 이미 기본값 false로 설정됨
        webhookUrl,
        userId: currentUser.id,
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**스키마 정의** (lib/schemas.ts):
```typescript
export const createAlertSchema = z.object({
  name: z
    .string()
    .min(2, '알림 이름은 최소 2자 이상이어야 합니다.')
    .max(100, '알림 이름은 최대 100자까지 입력 가능합니다.')
    .trim(),
  complexIds: z
    .array(z.string())
    .min(1, '최소 1개의 단지를 선택해주세요.'),
  tradeTypes: z
    .array(z.enum(['A1', 'B1', 'B2', 'B3']))
    .optional()
    .default([]),
  minPrice: z.number().int().nonnegative().optional().nullable(),
  maxPrice: z.number().int().nonnegative().optional().nullable(),
  notifyWebhook: z.boolean().optional().default(false),
  webhookUrl: z
    .string()
    .url('올바른 웹훅 URL 형식이 아닙니다.')
    .optional()
    .nullable(),
}).refine(
  (data) => !data.notifyWebhook || data.webhookUrl,
  {
    message: '웹훅 알림을 사용하려면 웹훅 URL이 필요합니다.',
    path: ['webhookUrl'],
  }
).refine(
  (data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
  {
    message: '최소 가격은 최대 가격보다 작거나 같아야 합니다.',
    path: ['maxPrice'],
  }
);
```

**개선사항**:
- ✅ 35% 코드 감소 (40줄 → 26줄)
- ✅ 복잡한 검증 로직을 스키마로 중앙화
- ✅ 기본값 처리 자동화 (|| [] 불필요)
- ✅ 조건부 필수 필드 검증 자동화

### 패턴 3: PUT/PATCH 핸들러 (부분 업데이트)

**Before** (수동 검증, 35줄):
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

    const { name, complexIds, notifyWebhook, webhookUrl } = body;

    // 조건부 검증
    if (notifyWebhook && !webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL required' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.update({
      where: { id: params.id, userId: currentUser.id },
      data: {
        name,
        complexIds,
        notifyWebhook: notifyWebhook || false,
        webhookUrl: webhookUrl || null,
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**After** (Zod 검증, 22줄, -13줄):
```typescript
import { validateRequest } from '@/lib/validation';
import { updateAlertSchema } from '@/lib/schemas';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth();

    // Zod 스키마로 입력 검증
    const validation = await validateRequest(request, updateAlertSchema);
    if (!validation.success) {
      return validation.response;
    }

    const updateData = validation.data;

    const alert = await prisma.alert.update({
      where: { id: params.id, userId: currentUser.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**스키마 정의** (lib/schemas.ts):
```typescript
// updateAlertSchema는 createAlertSchema와 동일하지만 모든 필드가 optional
// .refine() 검증은 유지됨
export const updateAlertSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  complexIds: z.array(z.string()).min(1).optional(),
  notifyWebhook: z.boolean().optional(),
  webhookUrl: z.string().url().optional().nullable(),
  // ... 기타 필드
}).refine(
  (data) => !data.notifyWebhook || data.webhookUrl,
  { message: '웹훅 알림을 사용하려면 웹훅 URL이 필요합니다.', path: ['webhookUrl'] }
);
```

**개선사항**:
- ✅ 37% 코드 감소 (35줄 → 22줄)
- ✅ 부분 업데이트도 동일한 패턴
- ✅ 타입 안전성 (updateData는 타입 추론됨)

## 기존 스키마 목록

`lib/schemas.ts`에 정의된 스키마:

### 인증 관련
- `registerSchema` - 회원가입
- `loginSchema` - 로그인
- `resetPasswordSchema` - 비밀번호 초기화
- `changePasswordSchema` - 비밀번호 변경
- `verifyUserSchema` - 사용자 승인

### 게시글/댓글
- `createPostSchema` - 게시글 작성
- `updatePostSchema` - 게시글 수정
- `createCommentSchema` - 댓글 작성
- `updateCommentSchema` - 댓글 수정
- `createReportSchema` - 신고

### 크롤링
- `crawlRequestSchema` - 크롤링 요청

### 알림
- `createAlertSchema` - 알림 생성
- `updateAlertSchema` - 알림 수정

### 스케줄
- `createScheduleSchema` - 스케줄 생성
- `updateScheduleSchema` - 스케줄 수정

### 즐겨찾기
- `createFavoriteSchema` - 즐겨찾기 추가
- `reorderFavoritesSchema` - 즐겨찾기 순서 변경

### 그룹
- `createGroupSchema` - 그룹 생성
- `updateGroupSchema` - 그룹 수정
- `addComplexToGroupSchema` - 그룹에 단지 추가

### 사용자 관리
- `updateUserRoleSchema` - 사용자 역할 변경

### 페이지네이션
- `paginationSchema` - 페이지네이션 파라미터

## 스키마 작성 가이드

### 1. 기본 타입 검증

```typescript
export const exampleSchema = z.object({
  // 문자열 (필수)
  name: z.string().min(2, '최소 2자').max(100, '최대 100자').trim(),

  // 숫자 (필수)
  age: z.number().int().nonnegative(),

  // 불리언 (기본값 있음)
  isActive: z.boolean().optional().default(true),

  // 배열 (최소/최대 길이)
  tags: z.array(z.string()).min(1).max(10),

  // Enum
  role: z.enum(['ADMIN', 'USER', 'GUEST']),

  // 이메일
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),

  // URL
  website: z.string().url('올바른 URL 형식이 아닙니다.').optional().nullable(),

  // 정규식
  phone: z.string().regex(/^010-\d{4}-\d{4}$/, '올바른 전화번호 형식이 아닙니다.'),
});
```

### 2. 기본값 설정

```typescript
export const exampleSchema = z.object({
  // optional().default()로 기본값 설정
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),

  // 배열 기본값
  tags: z.array(z.string()).optional().default([]),

  // 숫자 기본값
  retryCount: z.number().int().optional().default(3),
});
```

### 3. Nullable vs Optional

```typescript
export const exampleSchema = z.object({
  // optional: 필드가 없어도 됨 (undefined 허용)
  description: z.string().optional(),

  // nullable: null 허용
  deletedAt: z.date().nullable(),

  // optional + nullable: undefined와 null 모두 허용
  notes: z.string().optional().nullable(),
});
```

### 4. 조건부 검증 (.refine())

```typescript
export const exampleSchema = z.object({
  minPrice: z.number().optional().nullable(),
  maxPrice: z.number().optional().nullable(),
  useWebhook: z.boolean().optional().default(false),
  webhookUrl: z.string().url().optional().nullable(),
}).refine(
  // minPrice <= maxPrice 검증
  (data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
  {
    message: '최소 가격은 최대 가격보다 작거나 같아야 합니다.',
    path: ['maxPrice'], // 에러가 표시될 필드
  }
).refine(
  // useWebhook이 true면 webhookUrl 필수
  (data) => !data.useWebhook || data.webhookUrl,
  {
    message: '웹훅 URL이 필요합니다.',
    path: ['webhookUrl'],
  }
);
```

### 5. 타입 추론

```typescript
// 스키마 정의
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().optional(),
});

// 타입 추론
export type CreateUserInput = z.infer<typeof createUserSchema>;

// CreateUserInput은 자동으로:
// {
//   email: string;
//   name: string;
//   age?: number | undefined;
// }
```

## 마이그레이션 체크리스트

파일별 작업 시 다음 순서로 진행:

### 1. 스키마 확인
- [ ] `lib/schemas.ts`에 필요한 스키마가 있는지 확인
- [ ] 없으면 스키마 추가 (위의 가이드 참고)
- [ ] `export type XxxInput = z.infer<typeof xxxSchema>;` 타입 export 추가

### 2. API 라우트 수정
- [ ] `import { validateRequest } from '@/lib/validation';` 추가
- [ ] `import { xxxSchema } from '@/lib/schemas';` 추가
- [ ] 수동 `request.json()` 제거
- [ ] `const validation = await validateRequest(request, xxxSchema);` 추가
- [ ] `if (!validation.success) return validation.response;` 추가
- [ ] 수동 if 문 검증 제거
- [ ] `|| []`, `|| null`, `|| false` 같은 기본값 처리 제거 (스키마에서 처리)

### 3. 타입 체크
- [ ] `npx tsc --noEmit <파일명>` 실행
- [ ] validation.data 타입이 올바르게 추론되는지 확인

### 4. 테스트
- [ ] API 호출 테스트 (정상 케이스)
- [ ] 검증 실패 테스트 (필수 필드 누락, 범위 초과 등)
- [ ] 에러 응답 포맷 확인

## 작업 우선순위

### Phase 1: 핵심 API (우선순위 높음)
- [x] /api/alerts (POST, PUT, PATCH) ✅ 완료
- [ ] /api/schedules (POST, PUT)
- [ ] /api/auth/reset-password (POST)
- [ ] /api/user/change-password (POST)

### Phase 2: CRUD API (우선순위 중간)
- [ ] /api/favorites (POST)
- [ ] /api/favorites/reorder (POST)
- [ ] /api/groups (POST, PUT)
- [ ] /api/groups/[id]/complexes (POST)

### Phase 3: 기타 API (우선순위 낮음)
- [ ] /api/complexes (POST)
- [ ] /api/env-config (POST)
- [ ] /api/user-env-config (POST)
- [ ] /api/useful-links (POST)

## 스키마 작성 시 주의사항

### ⚠️ .partial() 사용 제한
`.refine()`이 있는 스키마는 `.partial()`을 사용할 수 없습니다:

```typescript
// ❌ 안됨
export const updateAlertSchema = createAlertSchema.partial();

// ✅ 해야 함
export const updateAlertSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  complexIds: z.array(z.string()).min(1).optional(),
  // ... 모든 필드를 optional()로 재정의
}).refine(
  (data) => !data.notifyWebhook || data.webhookUrl,
  { message: '웹훅 URL 필요', path: ['webhookUrl'] }
);
```

### ⚠️ Query Parameters 검증
URL query parameters는 모두 문자열이므로 `z.coerce`를 사용:

```typescript
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),      // "1" → 1
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),                // 문자열은 그대로
});

// 사용 예시
import { validateQuery } from '@/lib/validation';

const validation = validateQuery(request.url, paginationSchema);
if (!validation.success) return validation.response;

const { page, limit, search } = validation.data; // page, limit는 숫자
```

### ⚠️ Array 검증 시 주의
배열은 `.min()`으로 최소 길이를 검증:

```typescript
// 빈 배열 허용하지 않기
complexIds: z.array(z.string()).min(1, '최소 1개 필요'),

// 빈 배열 허용
tags: z.array(z.string()).optional().default([]),
```

## 참고 자료

- Zod 공식 문서: https://zod.dev
- 스키마 정의: `lib/schemas.ts`
- 검증 헬퍼: `lib/validation.ts`
- 예제: `app/api/alerts/route.ts`, `app/api/posts/route.ts`
