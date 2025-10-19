# 📜 Changelog

All notable changes to this project will be documented in this file.

---

## [2.1.0] - 2025-10-19

### ✨ Added
- **커뮤니티 시스템 완전 구현**
  - 게시판 (자유게시판, Q&A, 공지사항)
  - 댓글 & 대댓글 (nested replies)
  - 게시글 북마크 기능
  - 좋아요 시스템
  - 신고 시스템 (게시글/댓글)
  - 알림 시스템
  - 관리자 신고 관리 페이지

- **단지 목록 정보 강화**
  - 등록일 표시 (카드/리스트 뷰)
  - 최근 수집일 표시 (카드/리스트 뷰)

- **문서화**
  - `ANALYSIS_REPORT.md` - 페이지 효율성 분석 리포트
  - `CHANGELOG.md` - 변경 이력 관리

### 🔧 Fixed
- **크롤러 안정성 개선**
  - 컨텍스트 파괴 에러 자동 복구 로직 추가
  - 컨테이너 감지 로직 개선 (구체적 → 일반 순서)
  - 초기 매물 0개 검증 및 조기 종료

- **스케줄러 타임아웃 에러 수정**
  - HTTP 타임아웃에 2분 버퍼 추가
  - HeadersTimeoutError false-negative 방지

### 💎 Improved
- **UI/UX**
  - Lucide React 아이콘 라이브러리로 전환 (일관성 향상)
  - 커뮤니티 페이지 폰트 크기 70% 축소 (가독성 개선)
  - 커뮤니티 페이지 중앙 정렬 레이아웃
  - 모든 페이지 레이아웃 통일

### 🗄️ Database
- **마이그레이션**
  - `post_bookmarks` 테이블 생성
  - `comments.parentId` 컬럼 추가 (대댓글 지원)

---

## [2.0.0] - 2025-10-16

### ✨ Added
- **시스템 페이지 완전 리팩토링**
  - 1818줄 → 150줄 (91.7% 감소)
  - DatabaseSection, UsefulLinksSection, UserManagementSection 컴포넌트 분리

- **사용자 인증 시스템**
  - NextAuth.js 기반 인증
  - 사용자 역할 관리 (USER, ADMIN)
  - 사용자별 데이터 완전 분리

- **그룹 관리 기능**
  - 단지 그룹 생성/수정/삭제
  - 그룹별 필터링
  - 드래그앤드롭 순서 변경

### 🔧 Fixed
- **모바일 최적화**
  - 좌우 스크롤 문제 수정
  - 테이블 반응형 처리
  - 차트 모바일 최적화

---

## [1.1.0] - 2025-10-12

### ✨ Added
- **스케줄러 시스템**
  - node-cron 기반 자동 크롤링
  - Cron 표현식 빌더 UI
  - 실행 히스토리 관리
  - 에러 복구 & 재시도

- **알림 시스템**
  - 브라우저 알림
  - 이메일 알림 (nodemailer)
  - 웹훅 알림 (Slack, Discord)
  - 조건 기반 알림 설정

### 💎 Improved
- **크롤링 성능 51.3% 개선**
  - 8분 37초 → 4분 12초
  - domcontentloaded 적용
  - 동적 대기 시간 (API 패턴 기반)
  - 스크롤 거리 최적화 (500px → 800px)

---

## [1.0.0] - 2025-10-10

### ✨ Initial Release
- **크롤러 엔진**
  - Playwright 기반 헤드리스 브라우저
  - 무한 스크롤 완전 지원
  - 동일매물 묶기 자동 설정

- **데이터베이스**
  - PostgreSQL + Prisma ORM
  - 8개 모델 (Complex, Article, CrawlHistory, etc.)
  - 마이그레이션 시스템

- **웹 UI**
  - Next.js 14 App Router
  - 반응형 디자인
  - 다크모드 지원
  - 실시간 SSE 이벤트

- **데이터 시각화**
  - Recharts 차트 4종
  - 단일/비교 분석 UI
  - 필터 & 정렬

---

## Legend
- ✨ Added: 새로운 기능
- 🔧 Fixed: 버그 수정
- 💎 Improved: 개선사항
- 🗑️ Removed: 제거된 기능
- 🗄️ Database: 데이터베이스 변경
- 📚 Documentation: 문서 업데이트
- ⚡ Performance: 성능 개선
- 🔒 Security: 보안 개선

---

**참고**:
- 자세한 TODO 리스트는 [TODO.md](TODO.md) 참고
- 페이지 효율성 분석은 [ANALYSIS_REPORT.md](ANALYSIS_REPORT.md) 참고
- 아카이브된 문서는 [docs/archive/](docs/archive/) 참고
