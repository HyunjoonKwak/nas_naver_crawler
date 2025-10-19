# 시스템 페이지 리팩토링 가이드

## 📋 프로젝트 개요

**목표**: `app/system/page.tsx` 파일을 1818줄에서 350-400줄로 줄이기
**방법**: 단계적 리팩토링 (Phase 1 → Phase 2 → Phase 3)
**현재 상태**: Phase 1 완료 ✅

---

## 🎯 전체 로드맵

### Phase 1: 공통 패턴 추출 ✅ (완료)
- useApiCall hook 생성
- LoadingSpinner 컴포넌트 생성
- EmptyState 컴포넌트 생성
- BaseModal 컴포넌트 생성
- 시스템 페이지에 적용
- **결과**: 1818줄 → 1735줄 (83줄 감소)

### Phase 2: 주요 섹션 분리 🔄 (다음 단계)
- DatabaseSection 컴포넌트 분리 (예상: 400줄 감소)
- UsefulLinksSection 컴포넌트 분리 (예상: 200줄 감소)
- UserManagementSection 컴포넌트 분리 (예상: 200줄 감소)
- **예상 결과**: 1735줄 → 935줄

### Phase 3: 세부 컴포넌트 분리 (최종 단계)
- FileViewer 컴포넌트 분리
- DatabaseResetModal 컴포넌트 분리
- LinkFormModal 컴포넌트 분리
- DatabaseStatsSection 컴포넌트 분리
- **예상 결과**: 935줄 → 350-400줄

---

## ✅ Phase 1 완료 내역

### 1. 생성된 파일들

#### `/hooks/useApiCall.ts`
```typescript
// API 호출 공통 패턴을 hook으로 추상화
// 사용처: handleSaveLink, handleDeleteLink, handleUserApprove,
//         handleUserActivate, handleUserRoleChange, handleUserDelete
```

**주요 기능**:
- API 호출 중 로딩 토스트 표시
- 성공/실패 처리 자동화
- 에러 핸들링 통합

**사용 예시**:
```typescript
const { handleApiCall } = useApiCall();

await handleApiCall({
  method: 'POST',
  url: '/api/useful-links',
  body: { title, url },
  loadingMessage: '링크 추가 중...',
  successMessage: '링크가 추가되었습니다.',
  errorPrefix: '저장 실패',
  onSuccess: async () => {
    setShowModal(false);
    await fetchLinks();
  }
});
```

#### `/components/LoadingSpinner.tsx`
```typescript
// 로딩 스피너 재사용 컴포넌트
// 사용처: dbLoading, linksLoading, usersLoading, filesLoading
```

**Props**:
- `size`: 'sm' | 'md' | 'lg' (기본값: 'md')
- `color`: Tailwind color (기본값: 'blue-600')
- `message`: 로딩 메시지 (선택)

**사용 예시**:
```typescript
<LoadingSpinner color="cyan-600" />
<LoadingSpinner message="로딩 중..." />
```

#### `/components/EmptyState.tsx`
```typescript
// Empty state UI 재사용 컴포넌트
// 사용처: 파일 목록, 링크 목록, 사용자 목록
```

**Props**:
- `icon`: 이모지 아이콘
- `title`: 메인 타이틀
- `description`: 설명 텍스트 (선택)
- `action`: 버튼 등 액션 컴포넌트 (선택)

**사용 예시**:
```typescript
<EmptyState
  icon="📌"
  title="등록된 링크가 없습니다"
  description="유용한 사이트를 추가해보세요"
/>
```

#### `/components/BaseModal.tsx`
```typescript
// 모달 래퍼 컴포넌트 (Phase 2에서 사용 예정)
```

**Props**:
- `isOpen`: boolean
- `onClose`: () => void
- `title`: 모달 제목
- `subtitle`: 부제목 (선택)
- `children`: 모달 내용
- `size`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl'
- `gradient`: Tailwind gradient (기본값: 'from-blue-600 to-indigo-600')
- `icon`: 이모지 아이콘 (선택)

---

### 2. 변경된 파일

#### `app/system/page.tsx`

**추가된 imports**:
```typescript
import { useApiCall } from "@/hooks/useApiCall";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
```

**리팩토링된 함수들**:
1. `handleSaveLink` (246-264줄) - 29줄 → 15줄
2. `handleDeleteLink` (266-277줄) - 24줄 → 9줄
3. `handleUserApprove` (295-304줄) - 24줄 → 10줄
4. `handleUserActivate` (307-316줄) - 24줄 → 10줄
5. `handleUserRoleChange` (319-328줄) - 24줄 → 10줄
6. `handleUserDelete` (331-342줄) - 23줄 → 12줄

**교체된 UI 패턴**:
- Database Section 로딩 (743줄): `<LoadingSpinner color="cyan-600" />`
- Files 목록 로딩 (539줄): `<LoadingSpinner message="로딩 중..." />`
- Files empty state (543-548줄): `<EmptyState icon="📂" title="..." />`
- Links 로딩 (1216줄): `<LoadingSpinner color="emerald-600" />`
- Links empty state (1218-1222줄): `<EmptyState icon="📌" ... />`
- Users 로딩 (1317줄): `<LoadingSpinner color="rose-600" />`
- Users empty state (1319-1323줄): `<EmptyState icon="👥" ... />`

---

## 🔄 Phase 2 작업 계획

Phase 2에서는 주요 섹션을 별도 컴포넌트로 분리합니다.

### 2.1. DatabaseSection 컴포넌트 분리

**생성할 파일**: `/components/system/DatabaseSection.tsx`

**이동할 코드 범위**:
- Lines 741-1198 (약 458줄)

**이동할 State 변수들**:
```typescript
// DB Stats
const [dbStats, setDbStats] = useState<DBStats | null>(null);
const [dbLoading, setDbLoading] = useState(false);
const [showResetModal, setShowResetModal] = useState(false);
const [resetConfirmText, setResetConfirmText] = useState('');
const [isResetting, setIsResetting] = useState(false);
const [deleteFilesOption, setDeleteFilesOption] = useState(true);

// File Management
const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
const [jsonFiles, setJsonFiles] = useState<JSONFile[]>([]);
const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
const [filesLoading, setFilesLoading] = useState(false);
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
const [showModal, setShowModal] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv');

// Sub-tab
const [databaseTab, setDatabaseTab] = useState<'stats' | 'history' | 'files'>('stats');
```

**이동할 함수들**:
```typescript
fetchDBStats()
fetchFiles()
handleDatabaseReset()
handleDelete()
confirmDelete()
handleBulkDelete()
confirmBulkDelete()
toggleFileSelection()
toggleSelectAll()
openFileModal()
formatDate()
formatSize()
handleSort()
getSortedData()
renderFileList()
```

**Props 인터페이스**:
```typescript
interface DatabaseSectionProps {
  status: StatusData | null;
  refresh: number;
  isAdmin: boolean;
}
```

**사용 방법**:
```typescript
// app/system/page.tsx
import { DatabaseSection } from "@/components/system/DatabaseSection";

{activeSection === 'database' && (
  <DatabaseSection
    status={status}
    refresh={refresh}
    isAdmin={isAdmin}
  />
)}
```

---

### 2.2. UsefulLinksSection 컴포넌트 분리

**생성할 파일**: `/components/system/UsefulLinksSection.tsx`

**이동할 코드 범위**:
- Lines 1200-1309 (약 110줄)
- Lines 1599-1738 (LinkFormModal, 약 140줄)
- **총 약 250줄**

**이동할 State 변수들**:
```typescript
const [links, setLinks] = useState<any[]>([]);
const [groupedLinks, setGroupedLinks] = useState<Record<string, any[]>>({});
const [linksLoading, setLinksLoading] = useState(false);
const [showLinkModal, setShowLinkModal] = useState(false);
const [editingLink, setEditingLink] = useState<any>(null);
const [linkForm, setLinkForm] = useState({
  title: '',
  url: '',
  description: '',
  category: 'reference',
  icon: '🔗',
  order: 0,
});
```

**이동할 함수들**:
```typescript
fetchLinks()
handleAddLink()
handleEditLink()
handleSaveLink()
handleDeleteLink()
```

**Props 인터페이스**:
```typescript
interface UsefulLinksSectionProps {
  // 필요한 props 없음 (자체 완결)
}
```

**사용 방법**:
```typescript
// app/system/page.tsx
import { UsefulLinksSection } from "@/components/system/UsefulLinksSection";

{activeSection === 'info' && <UsefulLinksSection />}
```

---

### 2.3. UserManagementSection 컴포넌트 분리

**생성할 파일**: `/components/system/UserManagementSection.tsx`

**이동할 코드 범위**:
- Lines 1311-1437 (약 127줄)

**이동할 State 변수들**:
```typescript
const [users, setUsers] = useState<any[]>([]);
const [usersLoading, setUsersLoading] = useState(false);
```

**이동할 함수들**:
```typescript
fetchUsers()
handleUserApprove()
handleUserActivate()
handleUserRoleChange()
handleUserDelete()
```

**Props 인터페이스**:
```typescript
interface UserManagementSectionProps {
  // 필요한 props 없음 (자체 완결)
}
```

**사용 방법**:
```typescript
// app/system/page.tsx
import { UserManagementSection } from "@/components/system/UserManagementSection";

{activeSection === 'users' && <UserManagementSection />}
```

---

## 🔍 Phase 2 작업 순서

### Step 1: DatabaseSection 분리
1. `/components/system/DatabaseSection.tsx` 파일 생성
2. 관련 state, 함수, JSX 코드 이동
3. Props 인터페이스 정의
4. `app/system/page.tsx`에서 import 및 사용
5. 테스트 (DB 현황, 히스토리, 파일 뷰어 모든 탭)

### Step 2: UsefulLinksSection 분리
1. `/components/system/UsefulLinksSection.tsx` 파일 생성
2. 관련 state, 함수, JSX 코드 이동
3. LinkFormModal도 함께 포함
4. `app/system/page.tsx`에서 import 및 사용
5. 테스트 (링크 추가, 수정, 삭제)

### Step 3: UserManagementSection 분리
1. `/components/system/UserManagementSection.tsx` 파일 생성
2. 관련 state, 함수, JSX 코드 이동
3. `app/system/page.tsx`에서 import 및 사용
4. 테스트 (사용자 승인, 활성화, 역할 변경, 삭제)

### Step 4: 최종 확인
- 모든 기능 테스트
- 줄 수 확인 (`wc -l app/system/page.tsx`)
- Phase 3 진행 여부 결정

---

## 📊 예상 결과

### Phase 2 완료 후:
```
현재 (Phase 1 완료): 1735줄
─────────────────────────────────
DatabaseSection 분리:    -458줄
UsefulLinksSection 분리:  -250줄
UserManagementSection 분리: -127줄
─────────────────────────────────
예상 결과:               ~900줄
```

### 최종 (Phase 3 완료 후):
```
Phase 2 완료:           ~900줄
─────────────────────────────────
FileViewer 분리:        -80줄
DatabaseResetModal 분리: -100줄
DatabaseStatsSection 분리: -220줄
기타 최적화:            -150줄
─────────────────────────────────
최종 목표:             350-400줄
```

---

## 🛠️ 작업 시 주의사항

### 1. State 관리
- 각 섹션은 독립적인 state를 가져야 함
- 필요한 경우에만 props로 전달
- `status`, `refresh`, `isAdmin` 등은 공통으로 사용될 수 있음

### 2. useApiCall Hook 활용
- 모든 API 호출은 useApiCall을 사용
- 중복 코드 최소화

### 3. 컴포넌트 명명 규칙
- 섹션 컴포넌트: `{Name}Section.tsx`
- 모달 컴포넌트: `{Name}Modal.tsx`
- UI 컴포넌트: `{Name}.tsx`

### 4. 파일 구조
```
components/
├── system/              # 시스템 페이지 전용 컴포넌트
│   ├── DatabaseSection.tsx
│   ├── UsefulLinksSection.tsx
│   ├── UserManagementSection.tsx
│   ├── DatabaseResetModal.tsx (Phase 3)
│   ├── FileViewer.tsx (Phase 3)
│   └── LinkFormModal.tsx (Phase 3)
├── LoadingSpinner.tsx   # 공용 UI 컴포넌트
├── EmptyState.tsx
└── BaseModal.tsx

hooks/
└── useApiCall.ts        # 공용 hook
```

### 5. 테스트 체크리스트

#### DatabaseSection
- [ ] 통계 탭이 정상적으로 표시되는가?
- [ ] 크롤링 히스토리 탭이 작동하는가?
- [ ] 파일 뷰어 탭이 작동하는가?
- [ ] CSV/JSON 파일 목록이 로드되는가?
- [ ] 파일 선택 삭제가 작동하는가?
- [ ] 파일 모달이 열리고 정렬이 작동하는가?
- [ ] 데이터베이스 초기화 모달이 작동하는가?

#### UsefulLinksSection
- [ ] 링크 목록이 카테고리별로 표시되는가?
- [ ] 링크 추가 모달이 열리는가?
- [ ] 링크가 정상적으로 추가되는가?
- [ ] 링크 수정이 작동하는가?
- [ ] 링크 삭제가 작동하는가?
- [ ] 아이콘 선택기가 작동하는가?

#### UserManagementSection
- [ ] 사용자 목록이 표시되는가?
- [ ] 사용자 승인/취소가 작동하는가?
- [ ] 사용자 활성화/비활성화가 작동하는가?
- [ ] 역할 변경이 작동하는가?
- [ ] 사용자 삭제가 작동하는가?

---

## 📝 코드 예시

### DatabaseSection 컴포넌트 구조 (예시)

```typescript
"use client";

import { useState, useEffect } from "react";
import CrawlerHistory from "@/components/CrawlerHistory";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useApiCall } from "@/hooks/useApiCall";

interface DatabaseSectionProps {
  status: StatusData | null;
  refresh: number;
  isAdmin: boolean;
}

export const DatabaseSection = ({
  status,
  refresh,
  isAdmin
}: DatabaseSectionProps) => {
  const { handleApiCall } = useApiCall();

  // States
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [databaseTab, setDatabaseTab] = useState<'stats' | 'history' | 'files'>('stats');
  // ... 나머지 states

  // Effects
  useEffect(() => {
    fetchDBStats();
  }, []);

  // Handlers
  const fetchDBStats = async () => { /* ... */ };
  const handleDatabaseReset = async () => { /* ... */ };
  // ... 나머지 handlers

  return (
    <>
      {dbLoading ? (
        <LoadingSpinner color="cyan-600" />
      ) : dbStats ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            {/* ... */}
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
            {/* ... */}
          </div>

          {/* Tab Contents */}
          {databaseTab === 'stats' && (
            {/* Stats content */}
          )}

          {databaseTab === 'history' && (
            <CrawlerHistory refresh={refresh} />
          )}

          {databaseTab === 'files' && isAdmin && (
            {/* Files content */}
          )}
        </div>
      ) : null}
    </>
  );
};
```

---

## 🚀 다음 세션에서 시작하기

### Quick Start
1. 이 문서를 먼저 읽고 현재 상태 파악
2. `app/system/page.tsx`의 현재 줄 수 확인:
   ```bash
   wc -l app/system/page.tsx
   # 예상: 1735줄
   ```
3. Phase 2 Step 1부터 시작 (DatabaseSection 분리)
4. 각 단계마다 테스트 후 다음 단계 진행

### 필요한 명령어
```bash
# 개발 서버 시작
npm run dev

# 포트 3000 프로세스 종료 (필요시)
lsof -ti:3000 | xargs kill -9

# 줄 수 확인
wc -l app/system/page.tsx

# 특정 패턴 찾기
grep -n "pattern" app/system/page.tsx
```

### 파일 위치 참고
- 메인 파일: `app/system/page.tsx` (1735줄)
- Hooks: `hooks/useApiCall.ts`
- 공용 컴포넌트: `components/LoadingSpinner.tsx`, `components/EmptyState.tsx`, `components/BaseModal.tsx`
- 생성할 위치: `components/system/` 디렉토리

---

## 📌 중요 체크포인트

### Phase 2 시작 전
- [ ] Phase 1이 완료되어 있는가?
- [ ] 현재 줄 수가 1735줄인가?
- [ ] 모든 기능이 정상 작동하는가?
- [ ] useApiCall, LoadingSpinner, EmptyState가 이미 적용되어 있는가?

### DatabaseSection 분리 후
- [ ] `components/system/DatabaseSection.tsx` 파일이 생성되었는가?
- [ ] `app/system/page.tsx`에서 약 450줄이 감소했는가?
- [ ] 모든 DB 관련 기능이 정상 작동하는가?

### UsefulLinksSection 분리 후
- [ ] `components/system/UsefulLinksSection.tsx` 파일이 생성되었는가?
- [ ] `app/system/page.tsx`에서 약 250줄이 추가로 감소했는가?
- [ ] 링크 관리 기능이 정상 작동하는가?

### UserManagementSection 분리 후
- [ ] `components/system/UserManagementSection.tsx` 파일이 생성되었는가?
- [ ] `app/system/page.tsx`가 약 900줄이 되었는가?
- [ ] 사용자 관리 기능이 정상 작동하는가?

### Phase 2 완료 후
- [ ] 전체 줄 수가 900줄 전후인가?
- [ ] 모든 섹션이 정상 작동하는가?
- [ ] 콘솔 에러가 없는가?
- [ ] Phase 3 진행 여부 결정

---

## 🎓 참고 정보

### 현재 시스템 페이지 구조
```
SystemPage (1735줄)
├─ Imports & Types (1-78)
├─ Component Definition (80-660)
│  ├─ States (84-131)
│  ├─ Effects (133-162)
│  ├─ Fetch Functions (164-293)
│  ├─ Handler Functions (295-437)
│  └─ Utility Functions (439-657)
└─ JSX (659-1735)
   ├─ Header & Navigation (731-738)
   ├─ Database Section (741-1198) ← Phase 2 분리 대상
   ├─ Useful Links Section (1200-1309) ← Phase 2 분리 대상
   ├─ Users Section (1311-1437) ← Phase 2 분리 대상
   ├─ Scheduler Section (1439-1454)
   ├─ Settings Section (1456-1471)
   └─ Modals (1473-1733)
```

### TypeScript 인터페이스 위치
- `StatusData`: Lines 18-28
- `CSVFile`: Lines 30-38
- `JSONFile`: Lines 40-46
- `FileType`: Line 48
- `DBStats`: Lines 50-78

이 인터페이스들은 각 섹션 컴포넌트 파일로 함께 이동해야 합니다.

---

## ✨ 기대 효과

### 코드 품질
- **가독성**: 각 섹션이 독립된 파일로 관리되어 이해하기 쉬움
- **유지보수성**: 특정 기능 수정 시 해당 파일만 수정하면 됨
- **재사용성**: 각 섹션을 다른 페이지에서도 사용 가능
- **테스트 용이성**: 각 컴포넌트를 독립적으로 테스트 가능

### 개발 경험
- **빠른 파일 로딩**: 에디터에서 파일을 여는 속도 개선
- **명확한 책임**: 각 파일이 하나의 기능만 담당
- **협업 용이**: 여러 개발자가 동시에 다른 섹션 작업 가능

---

**문서 작성일**: 2025-10-18
**Phase 1 완료일**: 2025-10-18
**다음 작업**: Phase 2 - DatabaseSection 분리부터 시작
