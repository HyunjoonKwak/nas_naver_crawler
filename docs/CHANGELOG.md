# 📝 변경 이력 (Changelog)

## [v1.2.0] - 2025-01-15

### 📚 문서 정리 및 통합

#### 문서 구조 개선
- ✅ 11개 문서 → 6개 핵심 문서로 통합
- ✅ 2,853줄 → 2,327줄 (18% 감소)
- ✅ 중복 제거 및 명확한 구조화

#### 통합된 문서
1. **DEPLOYMENT.md** (새로 작성, 335줄)
   - `QUICK_DEPLOY.md` (180줄) 통합
   - `NAS_DEPLOYMENT_GUIDE.md` (224줄) 통합
   - `DEV_MODE_DEPLOYMENT.md` (149줄) 통합
   - Hot Reload 개발 모드 가이드
   - 프로덕션 빌드 가이드
   - PostgreSQL 설정 가이드

2. **README.md** (새로 작성, 269줄)
   - 메인 문서 인덱스
   - 프로젝트 개요
   - 사용자별 가이드 경로
   - `PROJECT_SUMMARY.md` (192줄) 내용 흡수
   - `README_NAS.md` (269줄) 내용 흡수

#### 삭제된 문서
- ❌ `DEVELOPMENT_POLICY.md` - 더 이상 필요 없음

#### API 연동 준비
- ✅ `API_INTEGRATION_GUIDE.md` (489줄) 추가
- ✅ 실거래가 API (국토교통부) 코드 구현 완료
- ✅ 역지오코딩 API (통계청 SGIS) 코드 구현 완료
- ✅ Mock 데이터 자동 폴백 기능
- ✅ API 복구 후 즉시 사용 가능한 상태

#### 개선 사항
- ✅ 사용자별 추천 문서 경로 제공
- ✅ 문서 간 크로스 링크 강화
- ✅ 빠른 참조 테이블 추가
- ✅ 명확한 목차 및 네비게이션

---

## [v1.1.0] - 2025-10-12

### 🚀 크롤러 성능 최적화 (51.3% 개선)

#### 성능 개선
- **원본**: 516,854ms (8분 37초)
- **현재**: 251,633ms (4분 12초)
- **개선률**: -51.3% ✅

#### 적용된 최적화
1. **domcontentloaded 전환**
   - `wait_until='networkidle'` → `wait_until='domcontentloaded'`
   - 초기 페이지 로딩 5-10초 단축
   - 파일: `logic/nas_playwright_crawler.py` (Line 162, 184, 258)

2. **API 대기 시간 단축**
   - 2.5초 → 1.5초
   - 파일: `logic/nas_playwright_crawler.py` (Line 444)

3. **빠른 종료 조건**
   - 8회 연속 체크 → 3회 연속 체크
   - 종료 감지 시간 77% 단축
   - 파일: `logic/nas_playwright_crawler.py` (Line 378)

4. **동적 대기 시간 시스템**
   - API 최근 감지 시 (< 0.5초): 0.3초 대기
   - API 미감지: 1.0초 대기
   - 평균 대기 시간 47% 감소 (1.5s → 0.8s)
   - 파일: `logic/nas_playwright_crawler.py` (Line 447-459)

5. **스크롤 거리 증가**
   - 500px → 800px (60% 증가)
   - 스크롤 시도 횟수 35% 감소 (107회 → 70회)
   - 파일: `logic/nas_playwright_crawler.py` (Line 417-420)

6. **성공/실패 카운팅 로직 수정**
   - 'overview' 존재 체크 → 실제 articles 데이터 체크
   - 정확한 성공률 표시
   - 파일: `logic/nas_playwright_crawler.py` (Line 708-712)

#### 성능 지표
```
처리 속도:    0.99 매물/초 (초기 0.48의 2배 향상)
스크롤 효율:  3.57 매물/스크롤 (초기 2.34의 1.5배)
성공률:       100% (5/5 단지)
데이터 무결성: 100% (250개 매물 수집)
```

#### 보류된 최적화
- **병렬 처리**: 네이버 서버 차단 위험으로 보류
- **더 공격적인 대기 시간**: 데이터 무결성 우선

---

### 📚 문서 개선
- ✅ `TODO.md` 추가 - 전략적 로드맵 및 체크리스트
- ✅ `CHANGELOG.md` 추가 - 변경 이력 추적
- ✅ `PERFORMANCE.md` 추가 - 성능 최적화 상세 문서

---

### 🐛 버그 수정
- Fixed: 첫 번째 단지 크롤링 실패 ("Execution context was destroyed")
- Fixed: 성공/실패 카운팅이 부정확하게 표시되던 문제

---

## [v1.0.0] - 2025-10-11

### ✨ 초기 릴리스

#### 주요 기능
- ✅ Next.js 15 웹 UI
- ✅ Playwright 헤드리스 크롤러
- ✅ Docker 컨테이너화
- ✅ NAS 환경 지원
- ✅ 다크 모드
- ✅ 반응형 디자인

#### 기술 스택
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Python 3.11, Playwright, aiohttp, Pandas
- **Infrastructure**: Docker, Docker Compose

#### 핵심 컴포넌트
- `app/page.tsx` - 메인 대시보드
- `components/CrawlerForm.tsx` - 크롤링 폼
- `components/CrawlerHistory.tsx` - 히스토리 관리
- `components/CrawlerStatus.tsx` - 시스템 모니터링
- `logic/nas_playwright_crawler.py` - 크롤링 엔진

#### 특징
- 사용자 친화적인 웹 인터페이스
- 실시간 크롤링 상태 표시
- JSON/CSV 형식 데이터 저장
- Docker 소켓 마운트로 크롤링 실행

---

## 향후 계획

### Phase 1: 데이터 활용 강화
- [ ] 실거래가 API 연동
- [ ] 필터링 & 검색 기능
- [ ] CSV 내보내기 개선

### Phase 2: 사용자 경험 개선
- [ ] 크롤링 히스토리 관리
- [ ] 알림 & 모니터링
- [ ] 대시보드 통계 강화

### Phase 3: 인프라 & 안정성
- [ ] 데이터베이스 도입 (PostgreSQL + Prisma)
- [ ] 에러 복구 & 재시도 로직
- [ ] 스케줄링 & 자동화

### Phase 4: 고급 기능
- [ ] AI 시세 예측
- [ ] 사용자 인증
- [ ] 웹소켓 실시간 업데이트

---

## 기여자

- **주요 개발자**: specialrisk_mac
- **지원**: Claude Code (Anthropic)

---

## 라이선스

MIT License
