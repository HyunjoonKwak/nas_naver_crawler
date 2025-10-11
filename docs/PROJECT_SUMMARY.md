# 프로젝트 요약

## 🎯 프로젝트 개요

**네이버 부동산 크롤러 with Next.js 웹 UI**

NAS 환경에서 헤드리스 모드로 동작하는 부동산 크롤러에 사용자 친화적인 웹 인터페이스를 추가한 프로젝트입니다.

---

## 🏗️ 기술 스택

### Frontend
- **Next.js 15** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **React Hooks** - 상태 관리

### Backend
- **Python 3.11** - 크롤링 로직
- **Playwright** - 헤드리스 브라우저
- **aiohttp** - 비동기 HTTP 클라이언트
- **Pandas** - 데이터 처리

### Infrastructure
- **Docker** - 컨테이너화
- **Docker Compose** - 서비스 오케스트레이션
- **Node.js 20** - 런타임

---

## 📂 프로젝트 구조

```
property_manager/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   ├── CrawlerForm.tsx    # 크롤링 폼
│   ├── CrawlerHistory.tsx # 히스토리
│   └── CrawlerStatus.tsx  # 상태 모니터링
├── logic/                 # Python 크롤링 로직
│   ├── nas_playwright_crawler.py
│   ├── simple_crawler.py
│   └── scheduler.py
├── Dockerfile             # Docker 이미지
├── docker-compose.yml     # 서비스 정의
└── config.env            # 환경설정
```

---

## 🚀 핵심 기능

### 1. 웹 UI 인터페이스
- 단지 번호 입력만으로 간편한 크롤링
- 실시간 진행 상태 표시
- 다크 모드 지원

### 2. 크롤링 엔진
- Playwright 헤드리스 브라우저
- 429 에러 회피
- 비동기 처리

### 3. 데이터 관리
- JSON, CSV 형식 저장
- 히스토리 조회
- 상세 데이터 뷰어

### 4. 모니터링
- Docker 상태 확인
- 실행 중인 작업 추적
- 크롤링된 파일 개수

---

## 🎨 UI 스크린샷

### 메인 대시보드
- 크롤링 폼 (왼쪽)
- 시스템 상태 (오른쪽)
- 히스토리 테이블 (하단)

### 반응형 디자인
- 데스크톱, 태블릿, 모바일 지원
- 라이트/다크 모드

---

## 🔄 워크플로우

1. **사용자 입력** → 단지 번호 입력
2. **API 호출** → `/api/crawl` POST 요청
3. **Docker 실행** → Python 크롤러 컨테이너 실행
4. **Playwright 크롤링** → 네이버 부동산 접속 및 데이터 수집
5. **데이터 저장** → JSON/CSV 파일로 저장
6. **결과 표시** → 웹 UI에 결과 표시

---

## 📊 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/crawl` | POST | 크롤링 실행 |
| `/api/results` | GET | 결과 조회 |
| `/api/status` | GET | 상태 확인 |

---

## 🐳 Docker 구성

### Multi-stage Build
1. **Stage 1**: Next.js 빌드 (Node.js)
2. **Stage 2**: 런타임 (Python + Node.js)

### 서비스
- **web**: Next.js 웹 서버 (포트 3000)

### 볼륨
- `crawled_data/`: 크롤링 결과
- `logs/`: 로그 파일

---

## 🔐 보안 고려사항

1. **Docker 소켓 마운트**: 크롤링 실행용
2. **환경변수**: config.env에 민감한 정보 저장
3. **포트 노출**: 필요한 경우 방화벽 설정

---

## 📈 향후 개선 계획

- [ ] 사용자 인증 추가
- [ ] 웹소켓으로 실시간 진행률 표시
- [ ] 데이터 시각화 (차트, 그래프)
- [ ] PWA 지원
- [ ] 다국어 지원
- [ ] 더 많은 부동산 사이트 지원

---

## 📝 변경 이력

### v1.0.0 (2025-10-11)
- ✅ Next.js 웹 UI 추가
- ✅ Playwright 헤드리스 크롤러 구현
- ✅ Docker 환경 최적화
- ✅ NAS 환경 지원

---

**Made with ❤️ for NAS users**
