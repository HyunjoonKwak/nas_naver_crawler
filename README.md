# 🏠 네이버 부동산 크롤러

NAS 환경용 헤드리스 부동산 크롤러 with Next.js 웹 UI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![Next.js](https://img.shields.io/badge/next.js-15-black.svg)

---

## ✨ 주요 기능

- 🌐 **웹 UI**: 사용자 친화적인 Next.js 인터페이스
- 🎭 **Playwright**: 헤드리스 브라우저로 429 에러 회피
- 📊 **실시간 모니터링**: 크롤링 상태 및 히스토리 관리
- 🐳 **Docker**: NAS 환경 최적화
- 📱 **반응형**: 모바일, 태블릿, 데스크톱 지원

---

## 🚀 빠른 시작

### 관리 메뉴 (가장 쉬운 방법)
```bash
./manage.sh
```

### 또는 직접 실행
```bash
# 시작
./scripts/start.sh

# 종료  
./scripts/stop.sh
```

### 브라우저 접속
```
http://localhost:3000
```

---

## 📖 문서

| 문서 | 설명 |
|------|------|
| [👉 START_HERE.md](docs/START_HERE.md) | **여기서 시작하세요!** |
| [🌐 WEB_UI_GUIDE.md](docs/WEB_UI_GUIDE.md) | 웹 UI 사용 가이드 |
| [📁 STRUCTURE.md](docs/STRUCTURE.md) | 프로젝트 구조 |
| [🎉 FINAL_SUMMARY.md](docs/FINAL_SUMMARY.md) | 완성 요약 |
| [🔧 README_NAS.md](docs/README_NAS.md) | NAS 환경 설정 |
| [📊 PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md) | 기술 문서 |

---

## 🛠️ 시스템 요구사항

- Docker 20.10+
- Docker Compose 2.0+
- CPU 2코어+ (권장: 4코어)
- RAM 4GB+ (권장: 8GB)

---

## 📁 프로젝트 구조

```
property_manager/
├── ⚙️ manage.sh          # 관리 메뉴 (시작/종료/재시작/상태/로그)
├── 📄 README.md          # 메인 문서
│
├── 📂 app/               # Next.js 앱 (API + 페이지)
├── 📂 components/        # React 컴포넌트
├── 📂 logic/             # Python 크롤링 엔진
├── 📂 scripts/           # 실행 스크립트 (start, stop, build 등)
├── 📂 docs/              # 프로젝트 문서
│
├── 🐳 Dockerfile
├── 🐳 docker-compose.yml
└── ⚙️ config.env
```

---

## 🎯 사용 방법

### 관리 메뉴 (권장)
```bash
./manage.sh
```
모든 기능을 메뉴에서 선택할 수 있습니다.

### 직접 실행
```bash
# 웹 UI 시작
./scripts/start.sh

# 웹 UI 종료
./scripts/stop.sh

# CLI 크롤링
./scripts/crawl.sh 22065

# 개발 환경
./scripts/dev.sh
```

---

## 📊 출력 데이터

- **위치**: `./crawled_data/`
- **형식**: JSON, CSV
- **내용**: 단지 정보, 매물 목록, 가격 정보

---

## 🔧 관리 명령어

### 관리 메뉴 사용 (권장)
```bash
./manage.sh
```

**메뉴 옵션:**
- 1️⃣ 웹서버 시작
- 2️⃣ 웹서버 종료
- 3️⃣ 웹서버 재시작
- 4️⃣ 상태 확인
- 5️⃣ 로그 확인
- 6️⃣ 빌드
- 7️⃣ 데이터 정리

### 직접 명령어
```bash
# 서비스 시작
./scripts/start.sh

# 서비스 중지
./scripts/stop.sh

# 로그 확인
docker-compose logs -f web
```

---

## 📝 라이선스

MIT License - 교육 및 연구 목적으로 사용하세요.

---

**Made with ❤️ for NAS users**
