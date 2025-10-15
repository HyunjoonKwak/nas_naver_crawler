# 📋 프로젝트 TODO 리스트 (UI/UX & 데이터 시각화/비교 중심)

> **마지막 업데이트**: 2025-10-15
> **현재 버전**: v1.2.0 - UI/UX 개선 및 통합 분석 기능 추가 진행 중

---

## 🎯 현재 상태

### ✅ 완료된 최적화 (2025-10-12)
- [x] **domcontentloaded 적용** - networkidle → domcontentloaded (초기 로딩 5-10초 단축)
- [x] **API 대기 시간 단축** - 2.5s → 1.5s
- [x] **빠른 종료 조건** - 8회 → 3회 연속 체크
- [x] **동적 대기 시간** - API 감지(0.3s) / 미감지(1.0s)
- [x] **스크롤 거리 최적화** - 500px → 800px (스크롤 횟수 35% 감소)
- [x] **성공/실패 카운팅 로직 수정**
- [x] **문서 통합 및 정리** - 9개 → 7개 문서

### 📊 성능 지표
```
원본:     516,854ms (8분 37초)
현재:     251,633ms (4분 12초)
개선률:   -51.3% ✅

처리 속도: 0.99 매물/초 (초기 0.48의 2배)
성공률:    100% (5/5 단지)
데이터:    250개 매물 수집 (무결성 100%)
```

---

## 🔄 새로운 우선순위 (2025-10-15)

> **사용자 요청 (2025-10-15)**:
> 1. UI/UX 개선을 먼저 진행
> 2. 데이터 시각화와 비교/분석 기능을 통합하여 구현

### 📋 새로운 작업 순서
1. 🎨 **Phase 1**: UI/UX 개선 (최우선)
2. 📊 **Phase 2**: 데이터 시각화 + 비교/분석 통합
3. 📁 **Phase 3**: 데이터 내보내기 강화
4. 🔐 **Phase 4**: 사용자 로그인 기능
5. 💾 **Phase 5**: 백업 및 복구
6. 🔥 **Phase 6**: 데이터베이스 고도화 (기존 Phase 1-4)

---

## 📅 Phase 1: UI/UX 개선 (우선순위: 최우선 🎨)

> **목표**: 사용자 경험 개선 및 디자인 시스템 구축
> **예상 시간**: 8-10시간

### 1️⃣ 디자인 시스템 및 공통 컴포넌트 구축 ⭐⭐⭐
> **담당 파일**: `components/ui/`, `app/globals.css`

#### 디자인 토큰 정의
- [ ] 컬러 시스템 정의
  - [ ] Primary 컬러 (Blue 계열)
  - [ ] Secondary 컬러 (Indigo 계열)
  - [ ] Success, Warning, Error 컬러
  - [ ] Gray 스케일 (50-950)
  - [ ] 다크 모드 컬러 매핑

- [ ] 타이포그래피 체계
  - [ ] 제목 스타일 (h1-h6)
  - [ ] 본문 스타일 (body, small)
  - [ ] 코드/숫자 스타일
  - [ ] 폰트 크기 스케일 정의

- [ ] 간격(Spacing) 시스템
  - [ ] Tailwind 기본 스케일 활용
  - [ ] 일관된 패딩/마진 규칙
  - [ ] 컴포넌트 간 간격 표준

- [ ] 그림자(Shadow) 시스템
  - [ ] 카드 그림자 (sm, md, lg, xl)
  - [ ] 호버 효과 그림자
  - [ ] 다크 모드 그림자

#### 공통 UI 컴포넌트
- [ ] Button 컴포넌트
  - [ ] Variants: primary, secondary, outline, ghost, danger
  - [ ] Sizes: sm, md, lg
  - [ ] Loading 상태
  - [ ] Disabled 상태
  - [ ] 아이콘 지원

- [ ] Card 컴포넌트
  - [ ] 기본 카드
  - [ ] 호버 효과
  - [ ] 헤더/푸터 슬롯
  - [ ] 반응형 패딩

- [ ] Badge 컴포넌트
  - [ ] 거래유형 배지 (매매, 전세, 월세)
  - [ ] 상태 배지 (성공, 실패, 진행중)
  - [ ] 다양한 색상 variants

- [ ] Modal/Dialog 컴포넌트
  - [ ] 기본 모달
  - [ ] 확인 다이얼로그
  - [ ] ESC 키로 닫기
  - [ ] 배경 클릭으로 닫기
  - [ ] 애니메이션

### 2️⃣ Toast 알림 시스템 추가 ⭐⭐⭐
> **기술 스택**: react-hot-toast

#### 설치 및 설정
- [ ] react-hot-toast 패키지 설치
  ```bash
  npm install react-hot-toast
  ```

- [ ] Toaster 컴포넌트 추가
  - [ ] `app/layout.tsx`에 Toaster 추가
  - [ ] 위치: top-right
  - [ ] 다크 모드 지원

#### Toast 타입 구현
- [ ] Success 토스트
  - [ ] 크롤링 성공 시
  - [ ] 즐겨찾기 추가 시
  - [ ] 설정 저장 시

- [ ] Error 토스트
  - [ ] 크롤링 실패 시
  - [ ] API 에러 시
  - [ ] 유효성 검증 실패 시

- [ ] Loading 토스트
  - [ ] 크롤링 진행 중
  - [ ] 데이터 로딩 중

- [ ] Promise 토스트
  - [ ] 비동기 작업 자동 처리
  - [ ] Loading → Success/Error 자동 전환

#### Toast 유틸 함수
- [ ] `lib/toast.ts` 생성
  - [ ] showSuccess(message)
  - [ ] showError(message)
  - [ ] showLoading(message)
  - [ ] showPromise(promise, messages)

### 3️⃣ 로딩 상태 개선 (Skeleton UI) ⭐⭐
> **담당 파일**: `components/ui/Skeleton.tsx`

#### Skeleton 컴포넌트
- [ ] 기본 Skeleton 컴포넌트
  - [ ] 애니메이션 (pulse)
  - [ ] 다양한 크기
  - [ ] 둥근 모서리 옵션

- [ ] 특화 Skeleton
  - [ ] CardSkeleton (단지 카드용)
  - [ ] TableSkeleton (테이블용)
  - [ ] ChartSkeleton (차트용)
  - [ ] StatCardSkeleton (통계 카드용)

#### 적용 위치
- [ ] 메인 페이지
  - [ ] 관심 단지 로딩 시
  - [ ] 통계 카드 로딩 시

- [ ] 단지 목록 페이지
  - [ ] 테이블 로딩 시
  - [ ] 검색 중

- [ ] 단지 상세 페이지
  - [ ] 매물 목록 로딩 시
  - [ ] 차트 로딩 시

- [ ] 분석 페이지
  - [ ] 차트 데이터 로딩 시

### 4️⃣ 반응형 네비게이션 개선 ⭐⭐
> **담당 파일**: `components/Navigation.tsx`

#### 모바일 네비게이션
- [ ] 햄버거 메뉴 버튼
  - [ ] 768px 이하에서만 표시
  - [ ] 애니메이션 아이콘

- [ ] 사이드 메뉴 구현
  - [ ] 슬라이드 인 애니메이션
  - [ ] 배경 오버레이
  - [ ] 메뉴 항목 리스트
  - [ ] 닫기 버튼

- [ ] 메뉴 상태 관리
  - [ ] useState로 열림/닫힘 관리
  - [ ] ESC 키로 닫기
  - [ ] 배경 클릭으로 닫기

#### 데스크톱 네비게이션
- [ ] 수평 메뉴바 유지
  - [ ] 현재 페이지 하이라이트
  - [ ] 호버 효과
  - [ ] 드롭다운 지원 (필요시)

#### 반응형 레이아웃
- [ ] 브레이크포인트 정의
  - [ ] Mobile: < 768px
  - [ ] Tablet: 768px - 1024px
  - [ ] Desktop: > 1024px

- [ ] 컨테이너 max-width
  - [ ] Mobile: 100%
  - [ ] Tablet: 90%
  - [ ] Desktop: 1280px

### 5️⃣ 접근성 개선 ⭐⭐
> **목표**: WCAG 2.1 AA 레벨 달성

#### ARIA 라벨
- [ ] 모든 버튼에 aria-label
  - [ ] 아이콘 버튼 특히 중요
  - [ ] 삭제, 편집 등 액션 버튼

- [ ] 폼 요소에 aria-describedby
  - [ ] 에러 메시지 연결
  - [ ] 도움말 텍스트 연결

- [ ] 모달/다이얼로그
  - [ ] role="dialog"
  - [ ] aria-modal="true"
  - [ ] aria-labelledby (제목)
  - [ ] aria-describedby (설명)

#### 키보드 네비게이션
- [ ] Tab 순서 최적화
  - [ ] 논리적 순서
  - [ ] tabIndex 적절히 사용

- [ ] 포커스 스타일
  - [ ] 모든 인터랙티브 요소
  - [ ] 명확한 아웃라인
  - [ ] 다크 모드에서도 보임

- [ ] 키보드 단축키
  - [ ] ESC: 모달/메뉴 닫기
  - [ ] Enter: 확인
  - [ ] Space: 체크박스/버튼
  - [ ] Arrow keys: 리스트 탐색 (선택)

#### 색상 대비
- [ ] 텍스트 대비율 체크
  - [ ] 일반 텍스트: 4.5:1 이상
  - [ ] 큰 텍스트: 3:1 이상
  - [ ] 링크 underline 또는 색상+아이콘

- [ ] 다크 모드 대비율
  - [ ] 동일 기준 적용
  - [ ] 그림자 조정

#### 스크린 리더
- [ ] 대체 텍스트
  - [ ] 이미지 alt 속성
  - [ ] 아이콘 sr-only 설명

- [ ] 의미론적 HTML
  - [ ] 적절한 헤딩 레벨 (h1-h6)
  - [ ] nav, main, aside, footer
  - [ ] article, section 사용

### 6️⃣ 성능 최적화 ⭐
> **목표**: 초기 로딩 < 2초, 페이지 전환 < 500ms

#### 이미지 최적화
- [ ] Next.js Image 컴포넌트 사용
  - [ ] 자동 최적화
  - [ ] Lazy loading
  - [ ] Placeholder blur

#### 코드 스플리팅
- [ ] 동적 import 사용
  - [ ] 큰 컴포넌트 lazy load
  - [ ] 차트 라이브러리 lazy load
  - [ ] 모달 컨텐츠 lazy load

- [ ] 번들 크기 최적화
  - [ ] Tree shaking 확인
  - [ ] 불필요한 의존성 제거

#### 데이터 페칭 최적화
- [ ] SWR 또는 React Query 도입 (선택)
  - [ ] 캐싱
  - [ ] 자동 리페치
  - [ ] Optimistic updates

- [ ] 페이지네이션
  - [ ] 긴 리스트에 적용
  - [ ] Infinite scroll (선택)

#### 렌더링 최적화
- [ ] React.memo 적용
  - [ ] 자주 리렌더되는 컴포넌트
  - [ ] 복잡한 컴포넌트

- [ ] useMemo, useCallback
  - [ ] 비싼 계산
  - [ ] 콜백 함수 최적화

**완료 조건**:
- ✅ 일관된 디자인 시스템 적용
- ✅ Toast 알림 모든 주요 액션에 적용
- ✅ 모든 로딩 상태에 Skeleton UI
- ✅ 모바일에서 햄버거 메뉴 작동
- ✅ 키보드만으로 모든 기능 접근 가능
- ✅ Lighthouse 접근성 스코어 90 이상

**예상 소요 시간**: 8-10시간

---

## 📅 Phase 2: 데이터 시각화 + 비교/분석 통합 (우선순위: 높음 📊)

> **목표**: 단일/다중 단지 분석을 통합 페이지에서 제공
> **예상 시간**: 12-15시간
> **핵심 전략**: 1번(시각화)과 2번(비교)을 하나의 통합 페이지로 구현

### 1️⃣ 차트 컴포넌트 라이브러리 구축 ⭐⭐⭐
> **기술 스택**: Recharts (이미 설치됨)
> **담당 폴더**: `components/charts/`

#### 기본 차트 컴포넌트
- [ ] PriceLineChart (가격 추이)
  - [ ] 시간별 평균 가격 라인
  - [ ] 거래유형별 다중 라인
  - [ ] 툴팁 커스터마이징
  - [ ] 반응형 크기
  - [ ] 다크 모드 색상

- [ ] TradePieChart (거래유형 분포)
  - [ ] 매매/전세/월세 비율
  - [ ] 레이블 표시
  - [ ] 호버 효과
  - [ ] 클릭 이벤트 (필터링)

- [ ] AreaScatterChart (면적별 가격 분포)
  - [ ] X축: 면적(㎡), Y축: 가격
  - [ ] 거래유형별 색상
  - [ ] 추세선 (선택)
  - [ ] 이상치 하이라이트

- [ ] ComplexBarChart (단지별 비교)
  - [ ] 여러 단지 나란히 비교
  - [ ] 그룹별 색상
  - [ ] 수평/수직 옵션
  - [ ] 스택 옵션

- [ ] ComplexRadarChart (종합 비교)
  - [ ] 5개 지표 (평균가, 매물수, 평당가 등)
  - [ ] 여러 단지 오버레이
  - [ ] 레이블 및 격자

- [ ] PriceHistogram (가격 분포)
  - [ ] 가격대별 매물 수
  - [ ] 10억 단위 구간
  - [ ] 평균값 마커

#### 차트 공통 기능
- [ ] 반응형 컨테이너
  - [ ] ResponsiveContainer 사용
  - [ ] 모바일/데스크톱 비율

- [ ] 테마 지원
  - [ ] 라이트/다크 모드 색상
  - [ ] Tailwind CSS 통합

- [ ] 데이터 없을 때 처리
  - [ ] 빈 상태 메시지
  - [ ] 플레이스홀더 차트

- [ ] 내보내기 기능
  - [ ] PNG 다운로드 (선택)
  - [ ] SVG 다운로드 (선택)

### 2️⃣ 통합 분석 API 엔드포인트 ⭐⭐⭐
> **담당 파일**: `app/api/analytics/route.ts`

#### API 설계
- [ ] GET /api/analytics
  - [ ] 쿼리 파라미터:
    - `complexNos`: 단지번호 (배열, 1개 이상)
    - `mode`: 'single' | 'compare'
    - `startDate`: 시작 날짜 (선택)
    - `endDate`: 종료 날짜 (선택)
    - `tradeTypes`: 거래유형 필터 (선택)

#### 단일 단지 분석 데이터
- [ ] 가격 추이 데이터
  - [ ] 크롤링 날짜별 평균 가격
  - [ ] 거래유형별 분리
  - [ ] 시계열 포맷

- [ ] 거래유형 분포
  - [ ] 각 유형별 개수
  - [ ] 백분율 계산

- [ ] 면적별 가격 데이터
  - [ ] 각 매물의 (면적, 가격) 쌍
  - [ ] 거래유형 라벨

- [ ] 통계 요약
  - [ ] 평균 가격
  - [ ] 중간값
  - [ ] 최소/최대
  - [ ] 표준편차

#### 다중 단지 비교 데이터
- [ ] 단지별 통계 비교
  - [ ] 각 단지의 요약 통계
  - [ ] 정규화된 지표 (레이더 차트용)

- [ ] 단지별 매물 수 비교
  - [ ] 거래유형별 개수
  - [ ] 총 매물 수

- [ ] 평당 가격 비교
  - [ ] 각 단지의 평당 평균
  - [ ] 순위

#### 데이터 캐싱
- [ ] 메모리 캐싱 (간단)
  - [ ] Map 사용
  - [ ] TTL: 5분

- [ ] 또는 파일 캐싱
  - [ ] JSON 파일로 저장
  - [ ] 크롤링 시 무효화

### 3️⃣ 단일 단지 심층 분석 섹션 ⭐⭐⭐
> **담당 파일**: `app/analytics/components/SingleAnalysis.tsx`

#### UI 레이아웃
- [ ] 단지 선택 드롭다운
  - [ ] 즐겨찾기 단지 목록
  - [ ] 검색 가능
  - [ ] 최근 조회 단지

- [ ] 기간 선택 (선택)
  - [ ] 최근 7일, 30일, 전체
  - [ ] 커스텀 날짜 범위

- [ ] 거래유형 필터
  - [ ] 체크박스: 매매, 전세, 월세
  - [ ] 전체 선택/해제

#### 차트 섹션
- [ ] 가격 추이 차트
  - [ ] PriceLineChart 사용
  - [ ] 2/3 너비

- [ ] 거래유형 분포 파이 차트
  - [ ] TradePieChart 사용
  - [ ] 1/3 너비

- [ ] 면적별 가격 산점도
  - [ ] AreaScatterChart 사용
  - [ ] 전체 너비

- [ ] 가격 분포 히스토그램
  - [ ] PriceHistogram 사용
  - [ ] 1/2 너비

#### 통계 카드
- [ ] 요약 통계 카드 그리드
  - [ ] 평균 가격
  - [ ] 중간값 가격
  - [ ] 매물 수
  - [ ] 평당 평균가
  - [ ] 최저가
  - [ ] 최고가

### 4️⃣ 다중 단지 비교 UI ⭐⭐⭐
> **담당 파일**: `app/analytics/components/CompareAnalysis.tsx`

#### 단지 선택 UI
- [ ] 멀티 셀렉트 체크박스
  - [ ] 즐겨찾기 단지 목록
  - [ ] 체크박스로 선택
  - [ ] 최대 5개 제한

- [ ] 선택된 단지 칩
  - [ ] 단지명 표시
  - [ ] X 버튼으로 제거
  - [ ] 드래그로 순서 변경 (선택)

- [ ] "비교하기" 버튼
  - [ ] 2개 이상 선택 시 활성화
  - [ ] 로딩 상태

#### 비교 테이블
- [ ] 단지 기본 정보
  - [ ] 단지명, 세대수, 동수
  - [ ] 위치 정보

- [ ] 통계 비교
  - [ ] 평균 가격 (거래유형별)
  - [ ] 매물 수
  - [ ] 평당 가격
  - [ ] 최저가/최고가

- [ ] 순위 표시
  - [ ] 각 항목별 1등, 2등, 3등
  - [ ] 색상 하이라이트

#### 비교 차트
- [ ] 레이더 차트 (종합 비교)
  - [ ] ComplexRadarChart 사용
  - [ ] 5개 지표 표시
  - [ ] 범례

- [ ] 사이드바이사이드 바 차트
  - [ ] ComplexBarChart 사용
  - [ ] 거래유형별 매물 수
  - [ ] 평균 가격

- [ ] 평당 가격 비교 차트
  - [ ] 수평 바 차트
  - [ ] 정렬 가능

### 5️⃣ 통합 분석 페이지 생성 ⭐⭐⭐
> **담당 파일**: `app/analytics/page.tsx`

#### 페이지 레이아웃
- [ ] 탭 구조
  - [ ] Tab 1: 단일 단지 분석
  - [ ] Tab 2: 단지 비교
  - [ ] 탭 전환 애니메이션

- [ ] 또는 토글 구조
  - [ ] 스위치로 모드 전환
  - [ ] 상태 유지

#### 상태 관리
- [ ] 선택된 단지 상태
  - [ ] 단일: 하나의 complexNo
  - [ ] 다중: complexNo 배열

- [ ] 필터 상태
  - [ ] 거래유형
  - [ ] 날짜 범위

- [ ] URL 파라미터 연동
  - [ ] 선택 상태를 URL에 반영
  - [ ] 공유 가능한 링크

#### 데이터 페칭
- [ ] useEffect로 API 호출
  - [ ] 단지 선택 시 자동 조회
  - [ ] 로딩 상태 관리

- [ ] 에러 처리
  - [ ] API 실패 시 토스트
  - [ ] 재시도 버튼

### 6️⃣ 필터 및 정렬 기능 ⭐⭐
> **담당 파일**: `components/filters/`

#### 필터 컴포넌트
- [ ] PriceRangeFilter
  - [ ] 최소/최대 가격 입력
  - [ ] 슬라이더 (선택)
  - [ ] 프리셋 (1억, 5억, 10억 등)

- [ ] AreaRangeFilter
  - [ ] 최소/최대 면적 입력
  - [ ] 평형 단위 지원
  - [ ] ㎡ ↔ 평 변환

- [ ] TradeTypeFilter
  - [ ] 체크박스 그룹
  - [ ] 매매, 전세, 월세
  - [ ] 전체 선택 토글

- [ ] DateRangeFilter
  - [ ] 시작/종료 날짜
  - [ ] 프리셋 (최근 7일, 30일)

#### 정렬 컴포넌트
- [ ] SortDropdown
  - [ ] 가격 오름/내림차순
  - [ ] 면적 오름/내림차순
  - [ ] 최신순/오래된순
  - [ ] 아이콘 (↑↓)

#### 필터 적용
- [ ] 실시간 필터링
  - [ ] 클라이언트 사이드 필터
  - [ ] 또는 API 쿼리 파라미터

- [ ] 필터 초기화 버튼
  - [ ] 모든 필터 리셋
  - [ ] 기본값으로 복원

### 7️⃣ 분석 결과 공유 기능 ⭐
> **담당 파일**: `app/analytics/components/ShareButton.tsx`

#### URL 파라미터 기반 공유
- [ ] 현재 상태를 URL에 인코딩
  - [ ] 선택된 단지
  - [ ] 필터 조건
  - [ ] 탭/모드

- [ ] "링크 복사" 버튼
  - [ ] URL 클립보드에 복사
  - [ ] 토스트로 완료 알림

- [ ] QR 코드 생성 (선택)
  - [ ] 모바일 공유용
  - [ ] 다운로드 가능

#### 소셜 공유 (선택)
- [ ] 공유 버튼
  - [ ] 카카오톡
  - [ ] 페이스북
  - [ ] 트위터

**완료 조건**:
- ✅ 6가지 이상의 차트 컴포넌트 구현
- ✅ 단일 단지 심층 분석 페이지 작동
- ✅ 다중 단지 비교 기능 작동
- ✅ 필터/정렬 모든 조건 적용
- ✅ URL로 분석 결과 공유 가능
- ✅ 반응형 디자인 (모바일/태블릿/데스크톱)

**예상 소요 시간**: 12-15시간

---

## 📅 Phase 3-6: 기존 Phase 재구성 (보류)

<details>
<summary>클릭하여 나머지 Phase 보기 (보류)</summary>

## 📅 Phase 3: 데이터 내보내기 강화
## 📅 Phase 4: 사용자 로그인 기능
## 📅 Phase 5: 백업 및 복구
## 📅 Phase 6: 데이터베이스 고도화 (기존 Phase 1-4)

</details>

---

## 🎯 추천 작업 순서

### Week 1-2 (8-10시간) - Phase 1
```
✅ UI/UX 개선
  1. 디자인 시스템 구축 (3-4h)
  2. Toast 알림 추가 (1-2h)
  3. Skeleton UI 구현 (2-3h)
  4. 반응형 네비게이션 (1-2h)
  5. 접근성 개선 (1-2h)
```

### Week 3-4 (12-15시간) - Phase 2
```
✅ 데이터 시각화 + 비교/분석
  6. 차트 컴포넌트 구축 (4-5h)
  7. 분석 API 구현 (2-3h)
  8. 단일 단지 분석 UI (3-4h)
  9. 다중 단지 비교 UI (3-4h)
```

---

## 📅 기존 Phase 1: 데이터베이스 도입 (우선순위: 보류 🔥)

### 1️⃣ PostgreSQL + Prisma 설정 ⭐⭐⭐
> **목표**: JSON 파일 → DB로 전환
> **예상 시간**: 5-6시간
> **기술 스택**: PostgreSQL + Prisma ORM

#### DB 선택 및 설정
- [ ] PostgreSQL Docker 컨테이너 설정
  - [ ] `docker-compose.yml`에 PostgreSQL 서비스 추가
  - [ ] 볼륨 설정 (데이터 영구 저장)
  - [ ] 환경 변수 설정 (DB 이름, 유저, 비밀번호)

- [ ] Prisma 설치 및 초기화
  - [ ] `npm install prisma @prisma/client`
  - [ ] `npx prisma init`
  - [ ] `.env` 파일에 DATABASE_URL 설정

- [ ] 개발 환경 설정
  - [ ] Prisma Studio 활성화
  - [ ] 디버깅 설정

#### 스키마 설계
- [ ] **complexes** 테이블 (단지 정보)
  ```prisma
  model Complex {
    id            String   @id @default(uuid())
    complexNo     String   @unique
    complexName   String
    totalHousehold Int?
    totalDong      Int?
    latitude       Float?
    longitude      Float?
    address        String?
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    articles       Article[]
    favorites      Favorite[]
  }
  ```

- [ ] **articles** 테이블 (매물 정보)
  ```prisma
  model Article {
    id                  String   @id @default(uuid())
    articleNo           String   @unique
    complexId           String
    complex             Complex  @relation(fields: [complexId], references: [id])
    realEstateTypeName  String
    tradeTypeName       String
    dealOrWarrantPrc    String
    rentPrc             String?
    area1               Float
    area2               Float?
    floorInfo           String?
    direction           String?
    articleConfirmYmd   String?
    tagList             Json?
    createdAt           DateTime @default(now())
    updatedAt           DateTime @updatedAt

    @@index([complexId])
    @@index([dealOrWarrantPrc])
    @@index([tradeTypeName])
  }
  ```

- [ ] **crawl_history** 테이블 (크롤링 히스토리)
  ```prisma
  model CrawlHistory {
    id              String   @id @default(uuid())
    complexNos      String[] // 크롤링한 단지 번호들
    totalComplexes  Int
    successCount    Int
    errorCount      Int
    totalArticles   Int
    duration        Int      // 소요 시간 (ms)
    status          String   // success, partial, failed
    errorMessage    String?
    createdAt       DateTime @default(now())
  }
  ```

- [ ] **favorites** 테이블 (즐겨찾기)
  ```prisma
  model Favorite {
    id         String   @id @default(uuid())
    complexId  String
    complex    Complex  @relation(fields: [complexId], references: [id])
    createdAt  DateTime @default(now())

    @@unique([complexId])
  }
  ```

- [ ] **alerts** 테이블 (알림 설정)
  ```prisma
  model Alert {
    id              String   @id @default(uuid())
    name            String
    complexIds      String[] // 관심 단지들
    tradeTypes      String[] // 매매, 전세, 월세
    minPrice        Int?
    maxPrice        Int?
    minArea         Float?
    maxArea         Float?
    isActive        Boolean  @default(true)
    notifyEmail     Boolean  @default(false)
    notifyBrowser   Boolean  @default(true)
    notifyWebhook   Boolean  @default(false)
    webhookUrl      String?
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }
  ```

#### 마이그레이션
- [ ] Prisma 마이그레이션 실행
  - [ ] `npx prisma migrate dev --name init`
  - [ ] 마이그레이션 파일 검토
  - [ ] 프로덕션 마이그레이션 계획

- [ ] 기존 JSON 데이터 이관
  - [ ] `scripts/migrate_json_to_db.ts` 작성
  - [ ] JSON 파일 읽기
  - [ ] Prisma Client로 데이터 삽입
  - [ ] 데이터 검증 (개수, 무결성)

#### API 수정
- [ ] **GET /api/results** → DB 쿼리로 변경
  - [ ] Prisma로 최근 크롤링 결과 조회
  - [ ] 페이지네이션 추가
  - [ ] 정렬 옵션 (날짜, 단지명)

- [ ] **POST /api/crawl** → DB 저장으로 변경
  - [ ] 크롤링 완료 후 Prisma로 저장
  - [ ] CrawlHistory 기록
  - [ ] 기존 매물 업데이트 vs 새 매물 삽입 로직

- [ ] **GET /api/complexes** (신규)
  - [ ] 단지 목록 조회
  - [ ] 필터링 (단지명, 가격대)
  - [ ] 정렬

- [ ] **GET /api/complexes/[id]** (신규)
  - [ ] 단지 상세 정보
  - [ ] 관련 매물 목록

- [ ] **GET /api/history** (신규)
  - [ ] 크롤링 히스토리 목록
  - [ ] 통계 데이터

#### 성능 최적화
- [ ] 인덱스 추가
  - [ ] complexNo 인덱스
  - [ ] 가격 range 인덱스
  - [ ] 날짜 인덱스

- [ ] 쿼리 최적화
  - [ ] N+1 문제 해결 (include 사용)
  - [ ] SELECT 최적화 (필요한 필드만)
  - [ ] 캐싱 전략 (Redis 고려)

#### 테스트
- [ ] CRUD 작동 확인
  - [ ] Create: 크롤링 데이터 삽입
  - [ ] Read: 단지/매물 조회
  - [ ] Update: 매물 정보 업데이트
  - [ ] Delete: 오래된 데이터 삭제

- [ ] 성능 테스트
  - [ ] 1000+ 매물 조회 속도
  - [ ] 복잡한 필터링 쿼리
  - [ ] 동시 접속 테스트

**완료 조건**:
- ✅ 모든 데이터가 DB에 저장됨
- ✅ JSON 파일 의존성 제거
- ✅ API 응답 속도 < 100ms
- ✅ Prisma Studio에서 데이터 확인 가능

**예상 소요 시간**: 5-6시간

---

## 📅 Phase 2: 알림 & 대시보드 강화 (우선순위: 높음 🚀)

### 2️⃣ 알림 시스템 구축 ⭐⭐⭐
> **목표**: 관심 매물 변동 시 자동 알림
> **예상 시간**: 4-5시간
> **담당 파일**: `app/alerts/page.tsx`, `app/api/alerts/route.ts`

#### 알림 조건 설정 UI
- [ ] 알림 설정 페이지 생성
  - [ ] `/app/alerts/page.tsx` 생성
  - [ ] 알림 목록 표시
  - [ ] 활성/비활성 토글

- [ ] 알림 생성/수정 모달
  - [ ] 알림 이름 입력
  - [ ] 관심 단지 선택 (멀티 셀렉트)
  - [ ] 가격 범위 슬라이더 (min-max)
  - [ ] 면적 범위 슬라이더
  - [ ] 거래 유형 체크박스 (매매/전세/월세)

- [ ] 알림 방식 선택
  - [ ] 브라우저 알림 체크박스
  - [ ] 이메일 알림 체크박스 + 이메일 주소
  - [ ] 웹훅 알림 체크박스 + URL

#### 알림 로직 구현
- [ ] 알림 체크 로직
  - [ ] 크롤링 완료 후 자동 실행
  - [ ] 모든 활성 알림 조회
  - [ ] 각 알림 조건에 맞는 매물 검색

- [ ] 가격 변동 감지
  - [ ] 이전 크롤링과 비교
  - [ ] 가격 하락 감지
  - [ ] 신규 매물 감지

- [ ] 알림 발송 큐
  - [ ] 알림 중복 방지
  - [ ] 발송 간격 제한 (1시간에 1회 등)
  - [ ] 실패 시 재시도

#### 알림 전송 구현
- [ ] **브라우저 알림** (Notification API)
  - [ ] 권한 요청
  - [ ] 알림 표시
  - [ ] 클릭 시 상세 페이지 이동

- [ ] **이메일 알림** (nodemailer)
  - [ ] SMTP 설정
  - [ ] HTML 이메일 템플릿
  - [ ] 매물 정보 포함
  - [ ] 링크 포함 (단지 상세 페이지)

- [ ] **웹훅 알림** (Slack, Discord)
  - [ ] Webhook URL 검증
  - [ ] Slack 형식 메시지
  - [ ] Discord 형식 메시지
  - [ ] 에러 처리

#### 알림 히스토리
- [ ] 알림 로그 테이블 (notification_logs)
  ```prisma
  model NotificationLog {
    id        String   @id @default(uuid())
    alertId   String
    type      String   // browser, email, webhook
    status    String   // sent, failed
    message   String
    sentAt    DateTime @default(now())
  }
  ```

- [ ] 알림 히스토리 페이지
  - [ ] 발송된 알림 목록
  - [ ] 읽음/안 읽음 상태
  - [ ] 필터링 (날짜, 타입)

**완료 조건**:
- ✅ 알림 설정 생성/수정/삭제 가능
- ✅ 조건에 맞는 매물 발견 시 알림 발송
- ✅ 3가지 알림 방식 모두 작동
- ✅ 알림 히스토리 조회 가능

**예상 소요 시간**: 4-5시간

---

### 3️⃣ 대시보드 통계 강화 ⭐⭐
> **목표**: 데이터 인사이트 제공
> **예상 시간**: 3-4시간
> **담당 파일**: `app/page.tsx`, `components/StatCard.tsx`

#### 추가 통계 차트
- [ ] **단지별 평균 가격** (막대 차트)
  - [ ] Top 10 단지 표시
  - [ ] 거래 유형별 색상 구분
  - [ ] 호버 시 상세 정보

- [ ] **거래 유형 분포** (파이 차트)
  - [ ] 매매/전세/월세 비율
  - [ ] 클릭 시 해당 매물 필터링

- [ ] **면적대별 가격 분포** (히스토그램)
  - [ ] 10평 단위로 그룹화
  - [ ] 평당 가격 표시

- [ ] **시간대별 크롤링 성공률** (라인 차트)
  - [ ] 최근 30일 데이터
  - [ ] 성공/실패 개수

#### Top 랭킹 카드
- [ ] **가장 비싼 매물** Top 5
  - [ ] 단지명, 가격, 면적
  - [ ] 클릭 시 상세 페이지

- [ ] **가장 저렴한 매물** Top 5
  - [ ] 동일 포맷

- [ ] **매물 많은 단지** Top 5
  - [ ] 단지명, 매물 수
  - [ ] 클릭 시 단지 페이지

#### 크롤링 성능 통계
- [ ] **평균 소요 시간** 카드
  - [ ] 최근 10회 평균
  - [ ] 트렌드 그래프 (mini chart)

- [ ] **수집 속도** 카드
  - [ ] 매물/초
  - [ ] 개선률 표시

- [ ] **데이터 총계** 카드
  - [ ] 총 단지 수
  - [ ] 총 매물 수
  - [ ] 마지막 크롤링 시간

#### UI 개선
- [ ] 반응형 차트 레이아웃
  - [ ] 모바일: 1열
  - [ ] 태블릿: 2열
  - [ ] 데스크톱: 3열

- [ ] 툴팁 상세 정보
  - [ ] 모든 차트에 툴팁
  - [ ] 상세 수치 표시

- [ ] 다크 모드 지원
  - [ ] 차트 색상 테마
  - [ ] 카드 배경 색상

**완료 조건**:
- ✅ 6개 이상의 차트/카드 표시
- ✅ 실시간 데이터 반영
- ✅ 반응형 디자인
- ✅ 다크 모드 지원

**예상 소요 시간**: 3-4시간

---

### 4️⃣ 크롤링 히스토리 관리 ⭐⭐
> **목표**: 이전 크롤링 결과 보관 및 비교
> **예상 시간**: 3-4시간
> **담당 파일**: `app/history/page.tsx`

#### 히스토리 목록 페이지
- [ ] `/app/history/page.tsx` 생성
  - [ ] 크롤링 히스토리 테이블
  - [ ] 날짜, 단지 수, 매물 수, 소요 시간
  - [ ] 성공/실패 상태

- [ ] 필터링 기능
  - [ ] 날짜 범위 선택
  - [ ] 상태별 필터 (성공/실패/부분성공)

- [ ] 정렬 기능
  - [ ] 날짜순
  - [ ] 소요 시간순
  - [ ] 매물 수순

#### 결과 비교 기능
- [ ] 두 날짜 선택 UI
  - [ ] 날짜 1 선택 드롭다운
  - [ ] 날짜 2 선택 드롭다운
  - [ ] "비교하기" 버튼

- [ ] 비교 결과 페이지
  - [ ] 가격 변동 표 (상승/하락)
  - [ ] 신규 매물 목록
  - [ ] 삭제된 매물 목록
  - [ ] 변동 그래프 (Recharts)

#### 데이터 정리 기능
- [ ] 자동 정리 설정
  - [ ] 보관 기간 설정 (기본 30일)
  - [ ] Cron job으로 자동 실행

- [ ] 수동 정리
  - [ ] 선택한 히스토리 삭제
  - [ ] 일괄 삭제 (특정 기간)

**완료 조건**:
- ✅ 과거 크롤링 결과 조회 가능
- ✅ 두 시점 비교하여 가격 변동 확인
- ✅ 자동 정리 기능 작동

**예상 소요 시간**: 3-4시간

---

## 📅 Phase 3: 스케줄링 & 자동화 (우선순위: 중간 ⚙️)

### 5️⃣ 스케줄링 시스템 ⭐⭐
> **목표**: 정기적 자동 크롤링
> **예상 시간**: 3-4시간
> **기술 스택**: node-cron

#### 스케줄러 구현
- [ ] node-cron 설치
  - [ ] `npm install node-cron`
  - [ ] `npm install @types/node-cron -D`

- [ ] 스케줄 관리 API
  - [ ] `POST /api/schedules` - 스케줄 생성
  - [ ] `GET /api/schedules` - 스케줄 목록
  - [ ] `PUT /api/schedules/[id]` - 스케줄 수정
  - [ ] `DELETE /api/schedules/[id]` - 스케줄 삭제
  - [ ] `PATCH /api/schedules/[id]/toggle` - 활성/비활성

- [ ] 스케줄 저장 (DB)
  ```prisma
  model Schedule {
    id          String   @id @default(uuid())
    name        String
    complexNos  String[] // 크롤링할 단지들
    cronExpr    String   // Cron 표현식
    isActive    Boolean  @default(true)
    lastRun     DateTime?
    nextRun     DateTime?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```

#### 스케줄 실행 엔진
- [ ] Cron job 초기화
  - [ ] 서버 시작 시 DB에서 스케줄 로드
  - [ ] 각 스케줄에 대해 cron job 등록

- [ ] 스케줄 실행 로직
  - [ ] 크롤링 API 호출
  - [ ] 실행 결과 기록
  - [ ] 다음 실행 시간 계산

- [ ] 에러 처리
  - [ ] 실행 실패 시 재시도
  - [ ] 알림 발송 (설정된 경우)
  - [ ] 에러 로그 저장

#### 스케줄 설정 UI
- [ ] 스케줄 관리 페이지 (`/app/schedules/page.tsx`)
  - [ ] 스케줄 목록 표시
  - [ ] 활성/비활성 토글
  - [ ] 다음 실행 시간 표시

- [ ] 스케줄 생성/수정 모달
  - [ ] 스케줄 이름
  - [ ] 크롤링할 단지 선택
  - [ ] Cron 표현식 빌더
    - [ ] 분, 시, 일, 월, 요일 선택
    - [ ] 사전 정의 패턴 (매일, 매주 등)
  - [ ] 미리보기 (다음 5회 실행 시간)

#### 실행 히스토리
- [ ] 스케줄 실행 로그 테이블
  ```prisma
  model ScheduleLog {
    id          String   @id @default(uuid())
    scheduleId  String
    status      String   // success, failed
    duration    Int
    articlesCount Int?
    errorMessage String?
    executedAt  DateTime @default(now())
  }
  ```

- [ ] 실행 히스토리 표시
  - [ ] 각 스케줄의 최근 실행 기록
  - [ ] 성공/실패 통계

**완료 조건**:
- ✅ Cron 표현식으로 스케줄 설정 가능
- ✅ 설정된 시간에 자동 크롤링 실행
- ✅ 실행 결과 기록 및 조회
- ✅ 웹 UI에서 스케줄 관리 가능

**예상 소요 시간**: 3-4시간

---

### 6️⃣ 에러 복구 & 재시도 로직 ⭐
> **목표**: 일시적 오류 자동 복구
> **예상 시간**: 2-3시간
> **담당 파일**: `logic/nas_playwright_crawler.py`

#### 단지별 독립 실행
- [ ] try-except로 각 단지 감싸기
  - [ ] 1개 실패해도 나머지 계속
  - [ ] 실패한 단지 목록 반환

#### 재시도 로직
- [ ] Exponential backoff
  - [ ] 1차: 1초 대기
  - [ ] 2차: 2초 대기
  - [ ] 3차: 4초 대기
  - [ ] 최대 3회 재시도

- [ ] 재시도 카운터 로깅
  - [ ] 각 시도마다 로그
  - [ ] 최종 성공/실패 기록

#### 상세 에러 로깅
- [ ] 실패 이유 분류
  - [ ] 네트워크 오류
  - [ ] 타임아웃
  - [ ] DOM 오류
  - [ ] 기타

- [ ] 스크린샷 저장 (실패 시)
  - [ ] `logs/screenshots/` 디렉토리
  - [ ] 파일명: `{complexNo}_{timestamp}.png`

- [ ] 에러 스택 트레이스
  - [ ] 상세 로그 파일 저장

#### 부분 성공 처리
- [ ] 부분 결과도 JSON 저장
  - [ ] 성공한 단지만 저장
  - [ ] 실패 정보 메타데이터 추가

- [ ] UI에 경고 표시
  - [ ] "일부 단지 크롤링 실패" 메시지
  - [ ] 실패한 단지 목록 표시
  - [ ] "재시도" 버튼

**완료 조건**:
- ✅ 일시적 네트워크 오류 자동 복구
- ✅ 부분 성공 결과 저장
- ✅ 실패 시 스크린샷 저장

**예상 소요 시간**: 2-3시간

---

## 📅 Phase 4: AI 시세 예측 (우선순위: 선택적 🤖)

### 7️⃣ AI 시세 예측 모델 ⭐
> **목표**: 머신러닝으로 시세 예측
> **예상 시간**: 10-15시간
> **기술 스택**: Python (scikit-learn or TensorFlow)

#### 데이터 수집
- [ ] 과거 실거래가 데이터
  - [ ] 공공데이터포털 API
  - [ ] 최소 1년치 데이터

- [ ] 현재 매물 가격 데이터
  - [ ] DB에서 크롤링 데이터 추출

- [ ] 단지 정보
  - [ ] 세대수, 동수, 준공연도
  - [ ] 위치 정보

- [ ] 외부 데이터 (선택)
  - [ ] 금리 데이터
  - [ ] 인구 통계
  - [ ] 교통 정보

#### 데이터 전처리
- [ ] 결측치 처리
  - [ ] 평균값 대체
  - [ ] 또는 제거

- [ ] 이상치 제거
  - [ ] IQR 방법
  - [ ] Z-score

- [ ] 정규화
  - [ ] MinMaxScaler
  - [ ] StandardScaler

- [ ] Feature engineering
  - [ ] 평당 가격 계산
  - [ ] 전용면적 비율
  - [ ] 거리 특성 (역, 학교 등)

#### 모델 선택 및 학습
- [ ] **베이스라인 모델** (선형 회귀)
  - [ ] 간단한 선형 회귀
  - [ ] 성능 측정

- [ ] **Random Forest**
  - [ ] 앙상블 학습
  - [ ] Feature importance 분석

- [ ] **LSTM** (시계열 예측)
  - [ ] TensorFlow/Keras
  - [ ] 시퀀스 데이터 준비
  - [ ] 모델 학습

- [ ] 하이퍼파라미터 튜닝
  - [ ] GridSearchCV
  - [ ] RandomizedSearchCV

#### 평가 및 검증
- [ ] Train/Test split (80/20)
- [ ] 교차 검증 (5-fold)
- [ ] 평가 지표
  - [ ] RMSE (Root Mean Squared Error)
  - [ ] MAE (Mean Absolute Error)
  - [ ] R² Score

#### API 통합
- [ ] 예측 API 엔드포인트
  - [ ] `POST /api/predict` - 시세 예측
  - [ ] 입력: 단지 정보
  - [ ] 출력: 예측 가격, 신뢰 구간

- [ ] 모델 저장 및 로드
  - [ ] Pickle 또는 HDF5
  - [ ] 버전 관리

#### UI 구현
- [ ] 예측 결과 페이지
  - [ ] 예측 가격 표시
  - [ ] 신뢰 구간 (95%)
  - [ ] 예측 vs 실제 비교 차트

- [ ] 모델 정확도 표시
  - [ ] RMSE, MAE, R²
  - [ ] 최근 업데이트 날짜

**완료 조건**:
- ✅ 단지별 향후 3개월 시세 예측
- ✅ 예측 정확도 80% 이상 (R² > 0.8)
- ✅ 웹 UI에서 예측 결과 확인

**예상 소요 시간**: 10-15시간

---

## 📅 Phase 5: 데이터 활용 강화 (보류 🔄)

> **현재 상태**: 우선순위 낮음 (나중에 진행)

### 8️⃣ 실거래가 데이터 수집 구현 (보류)
### 9️⃣ 데이터 필터링 & 검색 강화 (보류)
### 🔟 CSV 내보내기 개선 (보류)

**상세 내용은 하단 "보류된 태스크" 섹션 참조**

---

## 🎯 추천 작업 순서

### Week 1-2 (10-15시간)
```
✅ Phase 1: 데이터베이스 도입
  1. PostgreSQL + Prisma 설정 (5-6h)
  2. 스키마 설계 및 마이그레이션
  3. API 수정 및 테스트
```

### Week 3-4 (10-12시간)
```
✅ Phase 2: 알림 & 대시보드
  4. 알림 시스템 구축 (4-5h)
  5. 대시보드 통계 강화 (3-4h)
  6. 크롤링 히스토리 관리 (3-4h)
```

### Week 5-6 (5-7시간)
```
✅ Phase 3: 스케줄링 & 자동화
  7. 스케줄링 시스템 (3-4h)
  8. 에러 복구 로직 (2-3h)
```

### Week 7+ (10-15시간, 선택)
```
✅ Phase 4: AI 시세 예측
  9. 데이터 수집 및 전처리 (3-4h)
  10. 모델 학습 및 평가 (5-7h)
  11. API 통합 및 UI (2-4h)
```

---

## 📝 보류된 태스크 (Phase 5)

<details>
<summary>클릭하여 보류된 태스크 보기</summary>

### 실거래가 데이터 수집 (보류)
- 공공데이터포털 API 키 발급
- API 연동 로직 구현
- 데이터 캐싱
- 에러 처리

### 데이터 필터링 & 검색 (보류)
- 단지명 실시간 검색
- 가격/면적 범위 필터
- 정렬 기능
- URL 쿼리 파라미터

### CSV 내보내기 (보류)
- UTF-8 BOM 추가
- 엑셀 친화적 포맷
- 필터링된 결과 내보내기

</details>

---

## 📞 문의 및 제안

새로운 기능 제안이나 우선순위 변경 요청은 이슈로 등록해주세요.

**마지막 업데이트**: 2025-10-12
**다음 업데이트 예정**: Phase 1 완료 후
