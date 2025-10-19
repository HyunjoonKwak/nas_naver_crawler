# 🗺️ 사이트 맵

> **마지막 업데이트**: 2025-10-19
> **현재 버전**: v2.7.0

---

## 📱 메인 페이지

### 🏠 홈 & 인증

| 경로 | 설명 | 상태 | 네비게이션 |
|------|------|------|-----------|
| `/` | 랜딩 페이지 | ✅ | - |
| `/home` | 대시보드 홈 | ✅ | ✅ |
| `/auth/signup` | 회원가입 | ✅ | - |
| `/auth/error` | 인증 오류 | ✅ | - |
| `/auth/find-email` | 이메일 찾기 | ✅ | - |
| `/auth/reset-password` | 비밀번호 재설정 | ✅ | - |

### 🏢 단지 관리

| 경로 | 설명 | 상태 | 네비게이션 |
|------|------|------|-----------|
| `/complexes` | 단지 목록 (관심 단지) | ✅ | ✅ 메인 메뉴 |
| `/complex/[complexNo]` | 단지 상세 정보 | ✅ | - |

**주요 기능**:
- 가격 통계 (평균/최저/최고)
- 거래 유형별 통계
- 고급 필터링 (가격대, 매물 수)
- 단지 비교 (2-5개 선택)
- 24시간 매물 변동 추이
- 그룹 관리
- 드래그 앤 드롭 정렬

### 📊 데이터 분석

| 경로 | 설명 | 상태 | 네비게이션 |
|------|------|------|-----------|
| `/analytics` | 단지 분석 (단일/비교) | ✅ | ✅ 메인 메뉴 |

**주요 기능**:
- 단일 단지 분석
- 복수 단지 비교 분석
- 가격 추이 차트
- 거래 유형 분포
- 평형별 분석

**신규 API** (UI 미연결):
- `/api/analytics/dashboard` - 전체 통계 대시보드

### 💬 커뮤니티

| 경로 | 설명 | 상태 | 네비게이션 |
|------|------|------|-----------|
| `/community` | 게시판 목록 | ✅ | ✅ 메인 메뉴 |
| `/community/write` | 글쓰기 | ✅ | - |
| `/community/[id]` | 게시글 상세 | ✅ | - |
| `/community/edit/[id]` | 게시글 수정 | ✅ | - |

**주요 기능**:
- 카테고리별 게시판 (자유/Q&A/공지)
- 댓글 & 대댓글
- 좋아요, 북마크
- 신고 시스템
- 댓글 채택 (Q&A)

### ⚙️ 시스템 & 설정

| 경로 | 설명 | 상태 | 네비게이션 |
|------|------|------|-----------|
| `/system` | 시스템 관리 | ✅ | ✅ 메인 메뉴 |
| `/system/details` | 크롤링 히스토리 상세 | ✅ | - |
| `/scheduler` | 스케줄러 관리 | ✅ | `/system`에서 접근 |

**주요 기능**:
- 크롤링 히스토리
- 스케줄 관리 (생성/수정/삭제)
- Cron 표현식 설정
- 단지 선택 모드 (고정/동적)

### 🔔 알림 & 활동

| 경로 | 설명 | 상태 | 네비게이션 |
|------|------|------|-----------|
| `/notifications` | 알림 목록 | ✅ | 🔔 아이콘 |
| `/alerts` | 알림 설정 | ✅ | ⚠️ **미연결** |

**주요 기능** (`/alerts`):
- 알림 생성/수정/삭제
- 단지별 알림 조건 (가격/면적/거래유형)
- 알림 채널 선택 (브라우저/이메일/웹훅)
- 활성화/비활성화 토글

### 👑 관리자

| 경로 | 설명 | 상태 | 네비게이션 |
|------|------|------|-----------|
| `/admin/reports` | 신고 관리 | ✅ | ADMIN만 |

---

## 🔌 API 엔드포인트

### 인증 & 사용자

```
POST   /api/auth/register          # 회원가입
POST   /api/auth/find-email        # 이메일 찾기
POST   /api/auth/reset-password    # 비밀번호 재설정
POST   /api/auth/verify-user       # 사용자 확인
GET    /api/users                  # 사용자 목록
```

### 단지 & 매물

```
GET    /api/complexes              # 단지 목록 (권한 필터링)
POST   /api/complexes              # 단지 상세 조회
POST   /api/complexes/favorite     # 즐겨찾기 토글
GET    /api/complexes/search       # 단지 검색
GET    /api/complex-info           # 단지 정보 조회
```

### 크롤링

```
POST   /api/crawl                  # 크롤링 시작
GET    /api/crawl-status           # 크롤링 상태 조회
GET    /api/crawl-history          # 크롤링 히스토리
GET    /api/events                 # SSE 이벤트 스트림
```

### 데이터 분석

```
GET    /api/analytics              # 단지 분석 (단일/비교)
GET    /api/analytics/dashboard    # 대시보드 통계 (신규 v2.7.0)
GET    /api/analytics/price-trend  # 가격 추이
GET    /api/db-stats               # DB 통계
```

### 알림

```
GET    /api/alerts                 # 알림 설정 목록
POST   /api/alerts                 # 알림 설정 생성
PATCH  /api/alerts/[id]            # 알림 설정 수정
DELETE /api/alerts/[id]            # 알림 설정 삭제
GET    /api/notifications          # 알림 목록
PATCH  /api/notifications          # 알림 읽음 처리
```

### 커뮤니티

```
GET    /api/posts                  # 게시글 목록
POST   /api/posts                  # 게시글 작성
GET    /api/posts/[id]             # 게시글 상세
PATCH  /api/posts/[id]             # 게시글 수정
DELETE /api/posts/[id]             # 게시글 삭제
POST   /api/posts/[id]/like        # 좋아요
POST   /api/posts/[id]/bookmark    # 북마크
POST   /api/posts/[id]/report      # 신고
GET    /api/posts/[id]/comments    # 댓글 목록
POST   /api/posts/[id]/comments    # 댓글 작성
POST   /api/comments/[id]/accept   # 댓글 채택
POST   /api/comments/[id]/report   # 댓글 신고
```

### 그룹 관리

```
GET    /api/groups                 # 그룹 목록
POST   /api/groups                 # 그룹 생성
PATCH  /api/groups/[id]            # 그룹 수정
DELETE /api/groups/[id]            # 그룹 삭제
GET    /api/groups/[id]/complexes  # 그룹 내 단지 목록
```

### 스케줄러

```
GET    /api/schedules              # 스케줄 목록
POST   /api/schedules              # 스케줄 생성
PATCH  /api/schedules/[id]         # 스케줄 수정
DELETE /api/schedules/[id]         # 스케줄 삭제
POST   /api/schedules/[id]/run     # 수동 실행
GET    /api/schedules/debug        # 디버그 정보
POST   /api/schedules/init         # 초기화
```

### 즐겨찾기

```
GET    /api/favorites              # 즐겨찾기 목록
POST   /api/favorites              # 즐겨찾기 추가
DELETE /api/favorites              # 즐겨찾기 삭제
POST   /api/favorites/reorder      # 순서 변경
```

### 기타

```
GET    /api/geocode                # 역지오코딩
GET    /api/real-price             # 실거래가
GET    /api/useful-links           # 유용한 링크
GET    /api/csv                    # CSV 내보내기
POST   /api/upload                 # 파일 업로드
GET    /api/download               # 파일 다운로드
GET    /api/activities             # 활동 로그
GET    /api/status                 # 서버 상태
```

### 관리자

```
GET    /api/admin/users            # 사용자 목록
PATCH  /api/admin/users/[id]/role  # 역할 변경
DELETE /api/admin/users/[id]       # 사용자 삭제
GET    /api/admin/reports          # 신고 목록
```

---

## 🔗 네비게이션 연결 상태

### ✅ 메인 네비게이션 (Desktop/Mobile)

1. **홈** (`/home`) - 대시보드
2. **단지 목록** (`/complexes`) - 관심 단지 관리
3. **데이터 분석** (`/analytics`) - 단지 분석
4. **커뮤니티** (`/community`) - 게시판
5. **시스템** (`/system`) - 크롤링 관리

### ⚠️ 미연결 페이지

- **알림 설정** (`/alerts`) - 알림 조건 설정 페이지
  - ✅ API: 구현 완료
  - ✅ UI: 구현 완료
  - ❌ Navigation: 메뉴 미연결

---

## 📝 권한 시스템

### 역할 (Role)

- **ADMIN**: 모든 기능 + 관리자 페이지
- **FAMILY**: 가족 계정 (데이터 공유)
- **GUEST**: 게스트 (제한적 접근)

### 페이지 권한

| 페이지 | ADMIN | FAMILY | GUEST |
|--------|-------|--------|-------|
| 홈 | ✅ | ✅ | ✅ |
| 단지 목록 | 전체 | 가족 데이터 | 본인 데이터 |
| 데이터 분석 | 전체 | 가족 데이터 | 본인 데이터 |
| 커뮤니티 | ✅ | ✅ | ✅ |
| 시스템 | ✅ | ✅ | ✅ |
| 알림 설정 | ✅ | ✅ | ✅ |
| 관리자 | ✅ | ❌ | ❌ |

---

## 🎨 주요 기능 상태

| 기능 | 상태 | 버전 |
|------|------|------|
| 크롤링 시스템 | ✅ | v1.0.0 |
| 관심 단지 관리 | ✅ | v1.0.0 |
| 가격 통계 | ✅ | v2.2.0 |
| 고급 필터링 | ✅ | v2.4.0 |
| 단지 비교 | ✅ | v2.4.0 |
| 24시간 변동 | ✅ | v2.5.0 |
| 알림 설정 | ✅ | v2.6.0 |
| 데이터 최적화 | ✅ | v2.7.0 |
| 대시보드 API | ✅ | v2.7.0 |
| 커뮤니티 | ✅ | v2.1.0 |
| 스케줄러 | ✅ | v1.0.0 |
| 그룹 관리 | ✅ | v1.0.0 |

---

## 🚀 다음 구현 예정

### Phase 3 계속

- [ ] 대시보드 분석 UI 페이지
- [ ] 지도 통합 (Naver Maps)
- [ ] 가격 히트맵

### Phase 4 (미래)

- [ ] 모바일 앱 (React Native)
- [ ] 실시간 채팅
- [ ] AI 추천 시스템
