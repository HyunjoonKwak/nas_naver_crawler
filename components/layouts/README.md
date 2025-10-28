# Layout Components

페이지 레이아웃을 위한 재사용 가능한 컴포넌트들입니다.

## 구성 요소

### 1. PageLayout

모든 페이지의 기본 레이아웃입니다.

**특징:**
- Navigation 자동 포함
- MobileNavigation 자동 포함
- AuthGuard 선택적 적용
- 배경 스타일 선택 가능
- 최대 너비 조절 가능

**사용 예시:**

```tsx
import { PageLayout } from '@/components/layouts';

export default function MyPage() {
  return (
    <PageLayout
      title="페이지 제목"
      description="페이지 설명"
      background="default"
      requireAuth={true}
    >
      <div>페이지 내용</div>
    </PageLayout>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | 페이지 콘텐츠 |
| title | string | - | 페이지 제목 |
| description | string | - | 페이지 설명 |
| background | 'default' \| 'solid' \| 'white' | 'default' | 배경 스타일 |
| requireAuth | boolean | true | 인증 필요 여부 |
| headerContent | ReactNode | - | 커스텀 헤더 (title 대신) |
| maxWidth | 'full' \| '7xl' \| '6xl' \| '5xl' \| '4xl' | '7xl' | 최대 너비 |
| noPadding | boolean | false | 패딩 제거 여부 |

---

### 2. ListPageLayout

목록을 표시하는 페이지용 레이아웃입니다.

**특징:**
- 자동 로딩 상태 처리 (LoadingSpinner)
- 자동 빈 상태 처리 (EmptyState)
- 액션/필터 영역 구조화
- 통계 카드 영역 지원

**적합한 페이지:**
- 단지 관리 (`/complexes`)
- 커뮤니티 게시판 (`/community`)
- 알림 설정 (`/alerts`)
- 스케줄러 (`/scheduler`)

**사용 예시:**

```tsx
import { ListPageLayout } from '@/components/layouts';
import { Plus } from 'lucide-react';

export default function ComplexesPage() {
  const [loading, setLoading] = useState(true);
  const [complexes, setComplexes] = useState([]);

  return (
    <ListPageLayout
      title="단지 관리"
      description="관심 단지를 관리하고 매물을 확인하세요"
      loading={loading}
      loadingMessage="단지 목록을 불러오는 중..."
      isEmpty={complexes.length === 0}
      emptyIcon="📭"
      emptyTitle="등록된 단지가 없습니다"
      emptyDescription="단지 추가 버튼을 클릭하여 단지를 등록하세요"
      emptyAction={
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          단지 추가
        </button>
      }
      actions={
        <>
          <input
            type="text"
            placeholder="검색..."
            className="px-4 py-2 border rounded-lg"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Plus className="w-4 h-4" />
            추가
          </button>
        </>
      }
      filters={
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            전체
          </button>
          <button className="px-4 py-2 hover:bg-gray-100 rounded-lg">
            매매
          </button>
        </div>
      }
      stats={
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">총 단지</div>
            <div className="text-2xl font-bold">12</div>
          </div>
        </div>
      }
    >
      {/* 리스트 콘텐츠 */}
      <div className="space-y-4">
        {complexes.map((complex) => (
          <div key={complex.id}>...</div>
        ))}
      </div>
    </ListPageLayout>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | 리스트 콘텐츠 |
| title | string | required | 페이지 제목 |
| description | string | - | 페이지 설명 |
| loading | boolean | false | 로딩 상태 |
| loadingMessage | string | - | 로딩 메시지 |
| isEmpty | boolean | false | 빈 상태 여부 |
| emptyIcon | string | '📭' | 빈 상태 아이콘 |
| emptyTitle | string | '데이터가 없습니다' | 빈 상태 제목 |
| emptyDescription | string | - | 빈 상태 설명 |
| emptyAction | ReactNode | - | 빈 상태 액션 버튼 |
| actions | ReactNode | - | 상단 액션 영역 |
| filters | ReactNode | - | 필터/탭 영역 |
| stats | ReactNode | - | 통계 카드 영역 |
| background | 'default' \| 'solid' \| 'white' | 'default' | 배경 스타일 |
| requireAuth | boolean | true | 인증 필요 여부 |

---

### 3. DetailPageLayout

단일 항목의 상세 정보를 표시하는 페이지용 레이아웃입니다.

**특징:**
- 뒤로가기 버튼 자동 추가
- 로딩 상태 처리
- 액션 버튼 영역 (수정, 삭제 등)
- 탭 지원
- 사이드바 2열 레이아웃 지원
- 카드로 감싸기 옵션

**적합한 페이지:**
- 단지 상세 (`/complex/[complexNo]`)
- 커뮤니티 게시글 상세 (`/community/[id]`)
- 사용자 프로필 페이지

**사용 예시:**

```tsx
import { DetailPageLayout } from '@/components/layouts';
import { Edit, Trash2 } from 'lucide-react';

export default function ComplexDetailPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  return (
    <DetailPageLayout
      title="아크로리버파크 6단지"
      subtitle="서울시 강남구 대치동"
      backLink="/complexes"
      backText="단지 목록으로"
      loading={loading}
      loadingMessage="단지 정보를 불러오는 중..."
      actions={
        <>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Edit className="w-4 h-4" />
            수정
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg">
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </>
      }
      tabs={
        <div className="flex gap-4 px-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 border-b-2 ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent'
            }`}
          >
            기본 정보
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`pb-3 border-b-2 ${
              activeTab === 'articles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent'
            }`}
          >
            매물 목록
          </button>
        </div>
      }
      sidebar={
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-2">단지 정보</h3>
            <div className="text-sm space-y-1">
              <div>총 세대수: 1,234</div>
              <div>주차: 1.2대/세대</div>
            </div>
          </div>
        </div>
      }
      withCard={true}
      maxWidth="7xl"
    >
      {/* 상세 콘텐츠 */}
      {activeTab === 'info' && <div>기본 정보 내용</div>}
      {activeTab === 'articles' && <div>매물 목록 내용</div>}
    </DetailPageLayout>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | 메인 콘텐츠 |
| title | string | required | 페이지 제목 |
| subtitle | string | - | 부제목/설명 |
| backLink | string | - | 뒤로가기 링크 |
| backText | string | '목록으로' | 뒤로가기 텍스트 |
| loading | boolean | false | 로딩 상태 |
| loadingMessage | string | - | 로딩 메시지 |
| actions | ReactNode | - | 액션 버튼 영역 |
| tabs | ReactNode | - | 탭 영역 |
| sidebar | ReactNode | - | 사이드바 (2열 레이아웃) |
| background | 'default' \| 'solid' \| 'white' | 'default' | 배경 스타일 |
| requireAuth | boolean | true | 인증 필요 여부 |
| withCard | boolean | false | 카드로 감싸기 |
| maxWidth | 'full' \| '7xl' \| '6xl' \| '5xl' \| '4xl' | '7xl' | 최대 너비 |

---

## 마이그레이션 가이드

### 기존 페이지를 레이아웃으로 변경하기

**Before:**
```tsx
export default function MyPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold mb-6">제목</h1>
          <div>내용</div>
        </div>
        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
```

**After:**
```tsx
import { PageLayout } from '@/components/layouts';

export default function MyPage() {
  return (
    <PageLayout title="제목">
      <div>내용</div>
    </PageLayout>
  );
}
```

---

## 장점

1. **일관성**: 모든 페이지에서 동일한 레이아웃 구조 사용
2. **생산성**: 보일러플레이트 코드 제거로 빠른 페이지 개발
3. **유지보수**: 레이아웃 변경 시 한 곳만 수정
4. **재사용성**: 공통 기능(로딩, 빈 상태 등)을 자동 처리
5. **타입 안전성**: TypeScript로 props 타입 체크

---

## 주의사항

1. **AuthGuard**: `requireAuth={false}`를 사용하면 AuthGuard가 적용되지 않습니다 (로그인 페이지 등에서 사용)
2. **배경 스타일**: `background` prop으로 페이지 분위기 조절 가능
3. **최대 너비**: 콘텐츠가 넓은 경우 `maxWidth="full"` 사용
4. **패딩**: 전체 화면을 사용해야 하는 경우 `noPadding={true}` 사용
