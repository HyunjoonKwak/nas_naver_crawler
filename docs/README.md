# 📚 네이버 부동산 크롤러 - 문서 가이드

> **NAS 환경에서 동작하는 부동산 크롤러 with Next.js 웹 UI**

---

## 🚀 빠른 시작

### 처음 사용하시나요?

1. **[GETTING_STARTED.md](GETTING_STARTED.md)** - 설치부터 사용까지 완벽 가이드
2. **[DEPLOYMENT.md](DEPLOYMENT.md)** - NAS 배포 방법

### 5분 안에 시작하기

```bash
# 1. 저장소 클론
git clone <repository-url>
cd nas_naver_crawler

# 2. 환경 변수 설정
cp config.env .env

# 3. 컨테이너 시작
docker-compose up -d

# 4. 브라우저 접속
open http://localhost:3000
```

---

## 📖 문서 구조

### 필수 문서

| 문서 | 설명 | 대상 |
|------|------|------|
| **[GETTING_STARTED.md](GETTING_STARTED.md)** | 설치, 사용법, 문제 해결 | 모든 사용자 ⭐ |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | 배포 방법 (Hot Reload, 프로덕션) | 개발자 |
| **[API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)** | 국가 API 연동 (실거래가, 지오코딩) | 개발자 |

### 참고 문서

| 문서 | 설명 | 대상 |
|------|------|------|
| **[PERFORMANCE.md](PERFORMANCE.md)** | 성능 최적화 (51.3% 개선) | 개발자 |
| **[CHANGELOG.md](CHANGELOG.md)** | 버전별 변경 이력 | 모든 사용자 |

---

## 🎯 사용자별 가이드

### 🆕 신규 사용자

```
1. GETTING_STARTED.md 읽기
   ↓
2. 웹 UI에서 크롤링 실행
   ↓
3. 즐겨찾기 등록 및 스케줄링 설정
```

### 🏠 NAS 사용자

```
1. DEPLOYMENT.md > Hot Reload 모드 배포
   ↓
2. GETTING_STARTED.md > 웹 UI 사용법
   ↓
3. API_INTEGRATION_GUIDE.md > 실거래가 연동 (선택)
```

### 👨‍💻 개발자

```
1. GETTING_STARTED.md > 프로젝트 구조
   ↓
2. DEPLOYMENT.md > 개발 환경 구축
   ↓
3. PERFORMANCE.md > 성능 최적화 이해
   ↓
4. API_INTEGRATION_GUIDE.md > API 연동
```

---

## 🔍 주요 기능 문서

### 크롤링 기능

- **기본 사용법**: [GETTING_STARTED.md > 웹 UI 사용법](GETTING_STARTED.md#-웹-ui-사용법)
- **CLI 사용법**: [GETTING_STARTED.md > CLI 사용법](GETTING_STARTED.md#-cli-사용법)
- **성능 최적화**: [PERFORMANCE.md](PERFORMANCE.md)

### 스케줄링

- **설정 방법**: [GETTING_STARTED.md > 스케줄링](GETTING_STARTED.md#-스케줄링)
- **자동 크롤링**: 매일/매주 자동 실행

### 알림 기능

- **설정 방법**: [GETTING_STARTED.md > 알림](GETTING_STARTED.md#-알림)
- **조건별 알림**: 가격, 면적, 매물 수 변화 감지

### 실거래가 연동

- **API 설정**: [API_INTEGRATION_GUIDE.md > API 키 발급](API_INTEGRATION_GUIDE.md#-api-키-발급-방법)
- **사용 예시**: [API_INTEGRATION_GUIDE.md > 통합 시나리오](API_INTEGRATION_GUIDE.md#-통합-시나리오)

---

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링

### Backend
- **Python 3.11** - 크롤링 엔진
- **Playwright** - 헤드리스 브라우저
- **PostgreSQL** - 데이터베이스
- **Prisma** - ORM

### Infrastructure
- **Docker** - 컨테이너화
- **Docker Compose** - 오케스트레이션

---

## 📊 프로젝트 구조

```
nas_naver_crawler/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   ├── crawl/        # 크롤링 API
│   │   ├── geocode/      # 역지오코딩 API
│   │   ├── real-price/   # 실거래가 API
│   │   └── ...
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   ├── CrawlerForm.tsx    # 크롤링 폼
│   ├── Scheduler.tsx      # 스케줄러
│   ├── AlertConfig.tsx    # 알림 설정
│   └── ...
├── logic/                 # Python 크롤링 로직
│   ├── nas_playwright_crawler.py  # 메인 크롤러
│   ├── scheduler.py                # 스케줄러
│   └── ...
├── prisma/                # 데이터베이스
│   └── schema.prisma      # DB 스키마
├── docs/                  # 문서
│   ├── GETTING_STARTED.md
│   ├── DEPLOYMENT.md
│   ├── API_INTEGRATION_GUIDE.md
│   ├── PERFORMANCE.md
│   └── CHANGELOG.md
├── docker-compose.yml     # Docker 설정
└── config.env            # 환경 변수
```

---

## 🎨 주요 기능

### 1. 웹 UI 인터페이스
- ✅ 단지 번호/이름으로 검색
- ✅ 즐겨찾기 관리
- ✅ 실시간 크롤링 진행 상태
- ✅ 다크 모드 지원

### 2. 스케줄링
- ✅ 요일별/시간별 자동 실행
- ✅ 즐겨찾기 단지 자동 크롤링
- ✅ 실행 이력 조회

### 3. 알림 시스템
- ✅ 가격 변화 감지
- ✅ 신규 매물 알림
- ✅ 매물 수 변화 알림

### 4. 데이터 관리
- ✅ PostgreSQL 저장
- ✅ JSON/CSV 내보내기
- ✅ 크롤링 이력 관리

### 5. API 연동
- ✅ 실거래가 조회 (국토교통부)
- ✅ 역지오코딩 (통계청 SGIS)

---

## 📈 성능

### 최신 성능 지표 (v1.1.0)

```
크롤링 속도:   251초 (4분 12초)
처리 속도:     0.99 매물/초
성공률:        100%
개선률:        -51.3% (원본 대비)
```

**상세**: [PERFORMANCE.md](PERFORMANCE.md)

---

## 🔧 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|----------|
| 크롤링 실패 | [GETTING_STARTED.md > 문제 해결](GETTING_STARTED.md#-문제-해결) |
| 배포 오류 | [DEPLOYMENT.md > 문제 해결](DEPLOYMENT.md#-문제-해결) |
| API 연동 실패 | [API_INTEGRATION_GUIDE.md > 트러블슈팅](API_INTEGRATION_GUIDE.md#-트러블슈팅) |
| 성능 저하 | [PERFORMANCE.md](PERFORMANCE.md) |

---

## 🆘 지원

### 도움말

- **일반 사용**: [GETTING_STARTED.md](GETTING_STARTED.md)
- **배포 문제**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **API 문제**: [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)

### 문의

- **GitHub Issues**: 버그 리포트, 기능 요청
- **Discussions**: 사용법 질문, 개선 제안

---

## 📝 변경 이력

최신 버전: **v1.1.0** (2025-10-12)

- ✅ 크롤러 성능 51.3% 개선
- ✅ PostgreSQL + Prisma 도입
- ✅ 스케줄링 기능 추가
- ✅ 알림 시스템 구현
- ✅ 실거래가 API 연동

**전체 이력**: [CHANGELOG.md](CHANGELOG.md)

---

## 🔗 관련 링크

- [메인 README](../README.md)
- [GitHub Repository](https://github.com/yourusername/nas_naver_crawler)
- [Issues](https://github.com/yourusername/nas_naver_crawler/issues)

---

## 📄 라이선스

MIT License

---

**문서 버전**: 2.0.0
**최종 업데이트**: 2025-01-15
**상태**: ✅ 문서 통합 완료 (11개 → 5개)
