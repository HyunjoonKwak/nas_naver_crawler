# Fetch Wrapper 마이그레이션 가이드

> 이 문서는 수동 fetch 호출을 중앙화된 fetch-client로 마이그레이션하기 위한 가이드입니다.

## 현황

**전체 현황** (2025-01-31 기준):
- fetch 사용 파일: 43개 (app: 25개, components: 18개)
- 완료: 1개 (SchedulerSettings.tsx - 7개 fetch 호출 마이그레이션)
- 남은 작업: 42개 파일

**주요 장점**:
- ✅ 자동 JSON 직렬화/역직렬화
- ✅ 일관된 에러 처리
- ✅ 토스트 메시지 자동 통합
- ✅ 타입 안전성 (제네릭 지원)
- ✅ 보일러플레이트 50% 감소

## fetch-client API

### 기본 함수

```typescript
import { fetchGet, fetchPost, fetchPut, fetchPatch, fetchDelete } from '@/lib/fetch-client';

// GET
const result = await fetchGet<ResponseType>('/api/endpoint', options);

// POST
const result = await fetchPost<ResponseType>('/api/endpoint', body, options);

// PUT
const result = await fetchPut<ResponseType>('/api/endpoint', body, options);

// PATCH
const result = await fetchPatch<ResponseType>('/api/endpoint', body, options);

// DELETE
const result = await fetchDelete<ResponseType>('/api/endpoint', options);
```

### 옵션 (FetchOptions)

```typescript
interface FetchOptions {
  // 기본 fetch 옵션
  headers?: Record<string, string>;

  // 토스트 옵션
  showLoading?: boolean;         // 로딩 토스트 표시 (기본: false)
  showSuccess?: boolean;         // 성공 토스트 표시 (기본: false)
  showError?: boolean;           // 에러 토스트 표시 (기본: true)
  loadingMessage?: string;       // 로딩 메시지 (기본: "요청 처리 중...")
  successMessage?: string;       // 성공 메시지 (기본: "성공적으로 처리되었습니다.")
  errorMessage?: string;         // 에러 메시지 (기본: API 응답에서 추출)
}
```

### 반환 타입 (FetchResult)

```typescript
interface FetchResult<T> {
  ok: boolean;          // 성공 여부 (response.ok)
  status: number;       // HTTP 상태 코드
  data?: T;             // 응답 데이터 (타입 추론됨)
  error?: string;       // 에러 메시지
  response: Response;   // 원본 Response 객체
}
```

## 마이그레이션 패턴

### 패턴 1: GET 요청 (기본)

**Before** (수동 fetch, 10줄):
```typescript
const fetchData = async () => {
  try {
    const response = await fetch('/api/schedules');
    const data = await response.json();

    if (response.ok) {
      setSchedules(data.schedules || []);
    }
  } catch (error: any) {
    console.error('Failed to fetch:', error);
  }
};
```

**After** (fetch-client, 4줄, -6줄):
```typescript
const fetchData = async () => {
  const result = await fetchGet<{ schedules: Schedule[] }>('/api/schedules');
  setSchedules(result.data?.schedules || []);
};
```

**개선사항**:
- ✅ 60% 코드 감소
- ✅ try-catch 제거 (fetch-client가 자동 처리)
- ✅ response.json() 자동 처리
- ✅ 타입 안전성 (result.data는 `{ schedules: Schedule[] }` 타입)

### 패턴 2: POST 요청 (토스트 통합)

**Before** (수동 fetch + 토스트, 30줄):
```typescript
const handleCreate = async () => {
  const loadingToast = showLoading('알림 생성 중...');

  try {
    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        complexIds: formData.complexIds,
      }),
    });

    dismissToast(loadingToast);

    if (response.ok) {
      showSuccess('알림이 생성되었습니다.');
      handleCloseModal();
      fetchData();
    } else {
      const data = await response.json();
      showError(data.error || '알림 생성 실패');
    }
  } catch (error: any) {
    dismissToast(loadingToast);
    console.error('Failed to create alert:', error);
    showError('알림 생성 중 오류가 발생했습니다.');
  }
};
```

**After** (fetch-client, 15줄, -15줄):
```typescript
const handleCreate = async () => {
  const result = await fetchPost('/api/alerts',
    {
      name: formData.name,
      complexIds: formData.complexIds,
    },
    {
      showLoading: true,
      loadingMessage: '알림 생성 중...',
      showSuccess: true,
      successMessage: '알림이 생성되었습니다.',
    }
  );

  if (result.ok) {
    handleCloseModal();
    fetchData();
  }
};
```

**개선사항**:
- ✅ 50% 코드 감소
- ✅ 토스트 로직 자동 처리 (loadingToast, dismissToast 불필요)
- ✅ JSON.stringify 자동 처리
- ✅ headers 자동 설정
- ✅ 에러 처리 자동화 (showError 자동 호출)

### 패턴 3: PUT/PATCH 요청 (조건부 로직)

**Before** (30줄):
```typescript
const handleSave = async () => {
  const loadingToast = showLoading('스케줄 저장 중...');

  try {
    const url = editingSchedule
      ? `/api/schedules/${editingSchedule.id}`
      : '/api/schedules';
    const method = editingSchedule ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    dismissToast(loadingToast);

    if (response.ok) {
      showSuccess(editingSchedule ? '스케줄이 수정되었습니다!' : '스케줄이 생성되었습니다!');
      handleCloseModal();
      fetchData();
    } else {
      const data = await response.json();
      showError(data.error || '스케줄 저장에 실패했습니다.');
    }
  } catch (error: any) {
    dismissToast(loadingToast);
    console.error('Failed to save schedule:', error);
    showError('스케줄 저장 중 오류가 발생했습니다.');
  }
};
```

**After** (18줄, -12줄):
```typescript
const handleSave = async () => {
  const result = editingSchedule
    ? await fetchPut(`/api/schedules/${editingSchedule.id}`, payload, {
        showLoading: true,
        loadingMessage: '스케줄 저장 중...',
        showSuccess: true,
        successMessage: '스케줄이 수정되었습니다!',
      })
    : await fetchPost('/api/schedules', payload, {
        showLoading: true,
        loadingMessage: '스케줄 저장 중...',
        showSuccess: true,
        successMessage: '스케줄이 생성되었습니다!',
      });

  if (result.ok) {
    handleCloseModal();
    fetchData();
  }
};
```

**개선사항**:
- ✅ 40% 코드 감소
- ✅ fetchPut vs fetchPost로 명확한 의도
- ✅ 조건부 메시지 처리 간결화

### 패턴 4: DELETE 요청

**Before** (25줄):
```typescript
const confirmDelete = async () => {
  const loadingToast = showLoading('스케줄 삭제 중...');

  try {
    const response = await fetch(`/api/schedules?id=${scheduleId}`, {
      method: 'DELETE',
    });

    dismissToast(loadingToast);

    if (response.ok) {
      showSuccess('스케줄이 삭제되었습니다.');
      fetchData();
    } else {
      showError('스케줄 삭제에 실패했습니다.');
    }
  } catch (error: any) {
    dismissToast(loadingToast);
    console.error('Failed to delete:', error);
    showError('스케줄 삭제 중 오류가 발생했습니다.');
  } finally {
    setDialog({ isOpen: false, id: null });
  }
};
```

**After** (14줄, -11줄):
```typescript
const confirmDelete = async () => {
  const result = await fetchDelete(`/api/schedules?id=${scheduleId}`, {
    showLoading: true,
    loadingMessage: '스케줄 삭제 중...',
    showSuccess: true,
    successMessage: '스케줄이 삭제되었습니다.',
  });

  if (result.ok) {
    fetchData();
  }

  setDialog({ isOpen: false, id: null });
};
```

**개선사항**:
- ✅ 44% 코드 감소
- ✅ finally 블록 간소화 가능

### 패턴 5: 병렬 요청

**Before** (15줄):
```typescript
const loadData = async () => {
  const [schedulesRes, favRes, complexRes] = await Promise.all([
    fetch('/api/schedules'),
    fetch('/api/favorites'),
    fetch('/api/results'),
  ]);

  const schedulesData = await schedulesRes.json();
  const favData = await favRes.json();
  const complexData = await complexRes.json();

  setSchedules(schedulesData.schedules || []);
  setFavorites(favData.favorites || []);
  setComplexes(complexData.results || []);
};
```

**After** (11줄, -4줄):
```typescript
const loadData = async () => {
  const [schedulesResult, favResult, complexResult] = await Promise.all([
    fetchGet<{ schedules: Schedule[] }>('/api/schedules'),
    fetchGet<{ favorites: Favorite[] }>('/api/favorites'),
    fetchGet<{ results: Complex[] }>('/api/results'),
  ]);

  setSchedules(schedulesResult.data?.schedules || []);
  setFavorites(favResult.data?.favorites || []);
  setComplexes(complexResult.data?.results || []);
};
```

**개선사항**:
- ✅ json() 호출 제거
- ✅ 타입 안전성 (각 result.data가 타입 추론됨)

### 패턴 6: 에러만 토스트 (기본 동작)

**Before** (18줄):
```typescript
const fetchStatus = async () => {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    if (response.ok) {
      setStatus(data.status);
    } else {
      showError(data.error || '상태 조회 실패');
    }
  } catch (error: any) {
    console.error('Failed to fetch status:', error);
    showError('상태 조회 중 오류가 발생했습니다.');
  }
};
```

**After** (5줄, -13줄):
```typescript
const fetchStatus = async () => {
  const result = await fetchGet<{ status: string }>('/api/status');
  if (result.ok) {
    setStatus(result.data!.status);
  }
};
```

**개선사항**:
- ✅ 72% 코드 감소
- ✅ showError 자동 호출 (showError: true가 기본값)
- ✅ 에러 시 자동으로 토스트 표시

## 마이그레이션 체크리스트

파일별 작업 시 다음 순서로 진행:

### 1. Import 추가
```typescript
import { fetchGet, fetchPost, fetchPut, fetchPatch, fetchDelete } from '@/lib/fetch-client';
```

### 2. 기존 토스트 import 제거 (선택적)
showLoading, dismissToast는 더 이상 필요 없음 (fetch-client가 자동 처리):
```typescript
// Before
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';

// After (필요한 경우만 유지)
import { showSuccess, showError } from '@/lib/toast';
```

### 3. 함수 변환

**GET 요청**:
```typescript
// Before
const response = await fetch('/api/endpoint');
const data = await response.json();
if (response.ok) { ... }

// After
const result = await fetchGet<Type>('/api/endpoint');
if (result.ok) { ... }
```

**POST/PUT/PATCH 요청**:
```typescript
// Before
const loadingToast = showLoading('처리 중...');
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
dismissToast(loadingToast);
if (response.ok) { showSuccess('성공'); }

// After
const result = await fetchPost('/api/endpoint', data, {
  showLoading: true,
  loadingMessage: '처리 중...',
  showSuccess: true,
  successMessage: '성공',
});
```

**DELETE 요청**:
```typescript
// Before
const response = await fetch(`/api/endpoint?id=${id}`, { method: 'DELETE' });

// After
const result = await fetchDelete(`/api/endpoint?id=${id}`, {
  showLoading: true,
  showSuccess: true,
});
```

### 4. 타입 추가 (선택적, 권장)
```typescript
// API 응답 타입 정의
interface SchedulesResponse {
  schedules: Schedule[];
  total: number;
}

// 타입 적용
const result = await fetchGet<SchedulesResponse>('/api/schedules');
// result.data는 SchedulesResponse 타입으로 추론됨
```

### 5. 에러 처리 정리
```typescript
// Before (try-catch 필수)
try {
  const response = await fetch(...);
  // ...
} catch (error: any) {
  console.error('Failed:', error);
  showError('오류 발생');
}

// After (try-catch 선택적, fetch-client가 자동 에러 토스트)
const result = await fetchPost(...); // 에러 시 자동으로 토스트 표시
if (result.ok) { ... }
```

## 고급 사용법

### 1. 커스텀 헤더

```typescript
const result = await fetchPost('/api/endpoint', data, {
  headers: {
    'X-Custom-Header': 'value',
    'Authorization': `Bearer ${token}`,
  },
});
```

### 2. 토스트 비활성화

```typescript
// 에러 토스트만 비활성화
const result = await fetchGet('/api/endpoint', {
  showError: false,
});

// 모든 토스트 비활성화
const result = await fetchPost('/api/endpoint', data, {
  showLoading: false,
  showSuccess: false,
  showError: false,
});
```

### 3. 커스텀 에러 메시지

```typescript
const result = await fetchDelete('/api/endpoint', {
  errorMessage: '삭제 권한이 없습니다.', // API 응답 무시하고 이 메시지 사용
});
```

### 4. Response 객체 직접 접근

```typescript
const result = await fetchGet('/api/endpoint');

// HTTP 상태 코드 확인
if (result.status === 404) { ... }

// 원본 Response 객체 접근
const contentType = result.response.headers.get('content-type');
```

### 5. 클래스 기반 API 사용 (선택적)

```typescript
import { apiClient } from '@/lib/fetch-client';

// /api 경로 자동 추가
const result = await apiClient.get('/schedules'); // GET /api/schedules
const result = await apiClient.post('/alerts', data); // POST /api/alerts
```

## 작업 우선순위

### Phase 1: 복잡한 토스트 로직 (우선순위 높음)
많은 토스트 로직을 가진 파일부터 마이그레이션:
- [x] components/SchedulerSettings.tsx (7 fetch) ✅ 완료
- [ ] app/alerts/page.tsx (6 fetch)
- [ ] app/complexes/page.tsx (다수 fetch)
- [ ] components/CrawlerForm.tsx (2 fetch + 복잡한 로직)

### Phase 2: 중간 복잡도 파일
- [ ] components/GroupManagement.tsx
- [ ] app/community/page.tsx
- [ ] app/analytics/page.tsx

### Phase 3: 단순 파일
- [ ] components/CrawlerStatus.tsx (1 fetch)
- [ ] components/Navigation.tsx
- [ ] 기타 1-2개 fetch만 있는 파일

## 주의사항

### ⚠️ SSE 이벤트와 토스트 중복

SSE(Server-Sent Events)로 완료 토스트를 표시하는 경우 `showSuccess: false`로 설정:

```typescript
const result = await fetchPost('/api/schedules/run', undefined, {
  showLoading: true,
  showSuccess: false, // SSE에서 토스트 표시하므로 중복 방지
});
```

### ⚠️ 폴링(Polling) 시 토스트 비활성화

주기적으로 호출하는 경우 토스트 비활성화:

```typescript
setInterval(async () => {
  const result = await fetchGet('/api/status', {
    showError: false, // 폴링 실패 시 토스트 표시하지 않음
  });
}, 5000);
```

### ⚠️ body가 없는 POST 요청

body가 없는 POST는 `undefined` 전달:

```typescript
const result = await fetchPost('/api/schedules/run', undefined, options);
```

### ⚠️ Query Parameter vs Request Body

```typescript
// ❌ Query parameter를 body로 전달하면 안됨
const result = await fetchDelete('/api/schedules', { id: scheduleId });

// ✅ URL에 query parameter 포함
const result = await fetchDelete(`/api/schedules?id=${scheduleId}`);
```

## 통계

**마이그레이션 효과** (SchedulerSettings.tsx 기준):
- 코드 감소: 평균 50% (30줄 → 15줄)
- loadingToast/dismissToast 제거: 7회
- try-catch 제거: 5회
- response.json() 제거: 7회
- headers 설정 제거: 5회

**예상 전체 효과** (43개 파일):
- 약 1,000+ 줄 코드 감소
- 보일러플레이트 50% 감소
- 타입 안전성 100% 향상

## 참고 자료

- Fetch Client 구현: `lib/fetch-client.ts`
- Toast 유틸리티: `lib/toast.ts`
- 마이그레이션 샘플: `components/SchedulerSettings.tsx`
- API 응답 타입: `lib/api-response.ts`
