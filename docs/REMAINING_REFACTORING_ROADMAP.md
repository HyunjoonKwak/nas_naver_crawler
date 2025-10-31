# Remaining Refactoring Roadmap

> 완료된 Week 2-4 작업 이후 남은 리팩토링 작업 목록

## 완료된 작업 요약 ✅

### Week 2 Day 10
- ✅ Fetch Wrapper 패턴 구현 (lib/fetch-client.ts)
- ✅ 샘플 마이그레이션 (SchedulerSettings.tsx)
- ✅ 마이그레이션 가이드 문서화

### Week 3 Day 11-13
- ✅ Crawl Route 서비스 레이어 분리 (1,002 → 649 lines)
- ✅ 7개 서비스 모듈 생성 (1,570 lines)
- ✅ 완전한 문서화

### Week 3 Day 14-15
- ✅ Repository 패턴 구현 (6개 repository, 1,273 lines)
- ✅ 서비스 레이어 통합 (88 lines 중복 제거)
- ✅ 데이터 접근 계층 완전 분리

### Week 4 Day 16-20
- ✅ 대형 페이지 컴포넌트 리팩토링 전략 수립
- ✅ 훅/컴포넌트 추출 계획 문서화

---

## 🔄 진행 중/대기 중인 작업

### Priority 1: Fetch Wrapper Migration (High Impact)

**대상:** 42개 파일 (components + pages)

**현재 상태:** 1/43 완료 (SchedulerSettings.tsx)

**예상 효과:**
- 평균 40-50% 코드 감소
- 일관된 에러 처리
- Toast 알림 자동화
- 타입 안정성 향상

**마이그레이션 대상 파일:**

```
components/ (27개 파일)
├── ComplexGroupBadges.tsx
├── CrawlerForm.tsx
├── CrawlerHistory.tsx
├── CrawlerStatus.tsx
├── DongCodeSelector.tsx
├── GlobalSearch.tsx
├── GroupManagement.tsx
├── Navigation.tsx
├── NearbyComplexes.tsx
├── PropertyDetail.tsx
├── RealPriceAnalysis.tsx
├── SavedFilters.tsx
├── NotificationSettings.tsx
├── ExportButton.tsx
├── system/DatabaseSection.tsx
├── system/UsefulLinksSection.tsx
├── system/UserManagementSection.tsx
└── ... (10+ more)

app/ pages (15개 파일)
├── complexes/page.tsx (LARGE - 2,325 lines)
├── real-price/page.tsx (LARGE - 1,878 lines)
├── alerts/page.tsx
├── analytics/page.tsx
├── community/page.tsx
├── home/page.tsx
├── settings/profile/page.tsx
├── settings/schedules/page.tsx
└── ... (7+ more)
```

**단계별 접근:**
1. **Phase 1:** 간단한 컴포넌트 (10개) - 1-2일
   - CrawlerStatus, ExportButton, NotificationSettings 등
   - 단순 GET/POST 패턴만 있는 파일

2. **Phase 2:** 중간 복잡도 컴포넌트 (15개) - 2-3일
   - GroupManagement, GlobalSearch, RealPriceAnalysis 등
   - 여러 API 호출 + 복잡한 상태 관리

3. **Phase 3:** 대형 페이지 (2개) - 3-4일
   - complexes/page.tsx, real-price/page.tsx
   - 훅 추출과 함께 진행

4. **Phase 4:** 나머지 페이지 (15개) - 2-3일

**예상 소요:** 8-12일

---

### Priority 2: Console.log → Logger Migration (Medium Impact)

**대상:** 597개 파일 (14개만 완료)

**현재 상태:** 14/597 완료

**createLogger 사용 현황:**
```typescript
// ✅ Already using Logger (14 files)
- lib/logger.ts
- services/*.ts (7 files)
- repositories/*.ts (6 files)

// ❌ Still using console.log (583 files)
- app/api/**/*.ts (70+ files)
- components/**/*.tsx (50+ files)
- app/**/page.tsx (20+ files)
- lib/*.ts (10+ files)
- ... (430+ other files)
```

**마이그레이션 전략:**

1. **Phase 1: API Routes** (77개 파일) - 우선순위 HIGH
   ```typescript
   // Before
   console.log('[API] Fetching data...');
   console.error('Error:', error);

   // After
   import { createLogger } from '@/lib/logger';
   const logger = createLogger('API_NAME');
   logger.info('Fetching data');
   logger.error('Error occurred', error);
   ```

2. **Phase 2: Components** (50개 파일) - 우선순위 MEDIUM
   - Client components에서 logger 사용
   - 구조화된 로깅으로 디버깅 용이

3. **Phase 3: Pages** (20개 파일) - 우선순위 MEDIUM

4. **Phase 4: Utilities** (436개 파일) - 우선순위 LOW
   - 점진적으로 진행

**도구 활용:**
```bash
# 자동 변환 스크립트 작성 가능
find app/api -name "*.ts" -exec sed -i '' 's/console\.log/logger.info/g' {} \;
# (단, 수동 검토 필수)
```

**예상 소요:** 10-15일 (우선순위 HIGH만 3-4일)

---

### Priority 3: API Error Handling Standardization (High Impact)

**대상:** 77개 API routes (1개만 표준화)

**현재 상태:** 1/77 완료 (crawl/route.ts의 일부)

**표준화 대상:**

```typescript
// ❌ Before (일관성 없는 에러 처리)
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ✅ After (표준화된 에러 처리)
import { apiResponse, apiError } from '@/lib/api-response';
import { ApiResponseHelper } from '@/lib/api-response';

export const GET = ApiResponseHelper.handler(async (request) => {
  const data = await fetchData();
  return apiResponse(data, 'Success', 200);
});

// ApiResponseHelper가 자동으로:
// - 에러 catch
// - 로깅
// - 일관된 응답 포맷
// - 적절한 HTTP 상태 코드
```

**마이그레이션 우선순위:**

1. **Tier 1: 핵심 API** (10개) - 즉시
   - /api/complex
   - /api/articles
   - /api/favorites
   - /api/schedules
   - /api/alerts
   - /api/crawl-history
   - /api/analytics
   - /api/groups
   - /api/real-price
   - /api/geocode

2. **Tier 2: 자주 사용되는 API** (20개) - 1주일 내
   - /api/user/*
   - /api/settings/*
   - /api/admin/*
   - /api/notifications/*

3. **Tier 3: 나머지 API** (47개) - 2주일 내

**예상 소요:** 5-7일 (Tier 1만 1-2일)

---

### Priority 4: Zod Validation (Medium Impact)

**대상:** 49개 API handlers (4개만 완료)

**현재 상태:** 4/49 완료

**Zod 스키마 예시:**

```typescript
// lib/schemas/complex.schema.ts
import { z } from 'zod';

export const ComplexCreateSchema = z.object({
  complexNo: z.string().min(1, 'Complex number required'),
  complexName: z.string().min(1, 'Complex name required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const ComplexFilterSchema = z.object({
  groupId: z.string().optional(),
  sortBy: z.enum(['updatedAt', 'createdAt', 'complexName']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// app/api/complex/route.ts
import { ComplexCreateSchema } from '@/lib/schemas/complex.schema';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate
  const validated = ComplexCreateSchema.parse(body);

  // Now use validated data (type-safe!)
  // ...
}
```

**우선순위 API:**

1. **Tier 1: CRUD API** (15개)
   - POST/PUT/PATCH endpoints
   - complex, article, favorite, alert, schedule 등

2. **Tier 2: 복잡한 필터/검색** (10개)
   - Query parameter validation
   - Filter schemas

3. **Tier 3: 나머지** (24개)

**예상 소요:** 4-6일

---

### Priority 5: Large Page Component Refactoring (High Value, High Effort)

**대상:** 2개 대형 페이지 (계획 완료, 구현 대기)

**현재 상태:** 설계 100% / 구현 0%

**상세 계획:** `docs/PAGE_COMPONENT_REFACTORING.md` 참조

**Phase 1: app/complexes/page.tsx** (2,325 lines → ~400 lines)

1. 커스텀 훅 5개 추출 (~800 lines)
   ```
   hooks/
   ├── useComplexList.ts (150 lines)
   ├── useComplexCrawl.ts (200 lines)
   ├── useComplexFilters.ts (150 lines)
   ├── useComplexComparison.ts (150 lines)
   └── useComplexActions.ts (150 lines)
   ```

2. UI 컴포넌트 12개 추출 (~2,000 lines)
   ```
   components/complexes/
   ├── ComplexPageHeader.tsx (150 lines)
   ├── ComplexFiltersBar.tsx (100 lines)
   ├── ComplexGroupSidebar.tsx (250 lines)
   ├── ComplexCard.tsx (200 lines)
   ├── ComplexListItem.tsx (150 lines)
   ├── ComplexCardGrid.tsx (100 lines)
   ├── ComplexListView.tsx (100 lines)
   ├── ComplexAddForm.tsx (300 lines)
   ├── ComplexEditDialog.tsx (120 lines)
   ├── ComplexDeleteDialog.tsx (80 lines)
   ├── ComplexCrawlAllDialog.tsx (100 lines)
   └── ComplexComparisonModal.tsx (350 lines)
   ```

3. 메인 페이지 리팩토링 (~400 lines)

**Phase 2: app/real-price/page.tsx** (1,878 lines → ~350 lines)

- 유사한 접근 방식
- 5개 훅 + 10개 컴포넌트

**예상 소요:** 10-15일
- complexes page: 6-8일
- real-price page: 4-7일

---

## 📊 전체 로드맵 타임라인

### Immediate (1-2주)
1. ✅ API Error Handling - Tier 1 (10 routes)
2. ✅ Zod Validation - Tier 1 (15 handlers)
3. ✅ Logger Migration - API Routes only (77 files)

### Short-term (1개월)
4. ✅ Fetch Wrapper - Phase 1-2 (25 files)
5. ✅ API Error Handling - Tier 2 (20 routes)
6. ✅ Zod Validation - Tier 2 (10 handlers)

### Medium-term (2-3개월)
7. ✅ Page Refactoring - complexes page
8. ✅ Fetch Wrapper - Phase 3-4 (17 files)
9. ✅ API Error Handling - Tier 3 (47 routes)

### Long-term (3-6개월)
10. ✅ Page Refactoring - real-price page
11. ✅ Logger Migration - All files (520 files)
12. ✅ Zod Validation - Tier 3 (24 handlers)

---

## 🎯 Quick Wins (높은 가치, 낮은 노력)

다음 작업들은 적은 노력으로 큰 효과를 볼 수 있습니다:

### 1. API Error Handling - Tier 1 (1-2일, HIGH impact)
- 10개 핵심 API만 표준화
- 즉시 일관된 에러 처리
- 자동 로깅 + 구조화된 응답

### 2. Fetch Wrapper - 간단한 컴포넌트 (2-3일, MEDIUM impact)
- 10개 간단한 컴포넌트만
- 40-50% 코드 감소
- 에러 처리 개선

### 3. Zod Validation - CRUD API (2-3일, MEDIUM impact)
- 15개 POST/PUT endpoints만
- 타입 안정성 향상
- 런타임 에러 사전 방지

**Quick Win 총 예상 소요:** 5-8일
**예상 효과:** 핵심 기능 품질 크게 향상

---

## 📈 성공 메트릭스

각 작업의 성공을 측정할 지표:

### Fetch Wrapper Migration
- ✅ 마이그레이션된 파일 수 / 42
- ✅ 평균 코드 감소율 (목표: 40%)
- ✅ 타입 에러 0개 유지

### Logger Migration
- ✅ console.log → logger 전환율 (목표: 100%)
- ✅ 구조화된 로그 컨텍스트 포함률

### API Error Handling
- ✅ 표준화된 API 수 / 77
- ✅ 일관된 에러 응답 포맷 (목표: 100%)
- ✅ 자동 로깅 적용률

### Zod Validation
- ✅ 검증된 endpoint 수 / 49
- ✅ 런타임 타입 에러 감소율

### Page Refactoring
- ✅ 코드 감소율 (목표: 80%+)
- ✅ 재사용 가능한 훅/컴포넌트 수
- ✅ 번들 크기 감소

---

## 🛠️ 개발 도구 & 자동화

### 자동화 가능한 작업

1. **Console.log 변환**
   ```bash
   # 반자동 스크립트
   ./scripts/migrate-to-logger.sh app/api
   ```

2. **Import 정리**
   ```bash
   # ESLint auto-fix
   npm run lint:fix
   ```

3. **타입 체크**
   ```bash
   # CI/CD 통합
   npm run type-check
   ```

### VSCode Extensions 활용
- **Zod Snippets**: 스키마 빠른 작성
- **ESLint**: 자동 import 정리
- **Prettier**: 일관된 포맷팅

---

## 📝 결론

**완료된 작업:**
- Week 2-4 리팩토링 (10 commits)
- 서비스/Repository 아키텍처 구축
- 1,570 + 1,273 = 2,843줄의 재사용 가능한 코드 생성

**남은 핵심 작업:**
1. API Error Handling (Tier 1) - **Quick Win**
2. Zod Validation (Tier 1) - **Quick Win**
3. Fetch Wrapper (Phase 1-2) - **Quick Win**
4. Page Refactoring - **High Value**

**추천 순서:**
1. Quick Wins 먼저 (5-8일)
2. Fetch Wrapper 점진적 진행
3. Page Refactoring (병렬 작업 가능)
4. Logger Migration은 백그라운드에서 점진적

전체 작업을 한번에 하기보다는, **Quick Wins를 먼저 완료**하여 즉각적인 가치를 얻고, 나머지는 **점진적으로 진행**하는 것을 권장합니다.
