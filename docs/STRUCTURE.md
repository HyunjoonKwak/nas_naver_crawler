# 📁 프로젝트 구조

## 루트 디렉토리

```
property_manager/
├── 📄 README.md              # 메인 README
├── 🚀 start.sh               # 빠른 시작 스크립트
├── ⚙️ config.env             # 환경설정
├── 🐳 Dockerfile             # Docker 이미지
├── 🐳 docker-compose.yml     # Docker Compose
├── 📦 package.json           # Node.js 패키지
├── 🐍 requirements.txt       # Python 패키지
└── 📝 .gitignore             # Git 무시 파일
```

## 주요 디렉토리

### 🌐 app/ - Next.js 애플리케이션
```
app/
├── api/                      # API 라우트
│   ├── crawl/               # 크롤링 실행
│   ├── results/             # 결과 조회
│   └── status/              # 상태 확인
├── globals.css              # 글로벌 스타일
├── layout.tsx               # 루트 레이아웃
└── page.tsx                 # 메인 페이지
```

### ⚛️ components/ - React 컴포넌트
```
components/
├── CrawlerForm.tsx          # 크롤링 입력 폼
├── CrawlerHistory.tsx       # 히스토리 테이블
└── CrawlerStatus.tsx        # 상태 대시보드
```

### 🐍 logic/ - 크롤링 로직
```
logic/
├── nas_playwright_crawler.py  # Playwright 크롤러 (메인)
├── simple_crawler.py          # 간단한 크롤러 (백업)
└── scheduler.py               # 스케줄러
```

### 📜 scripts/ - 실행 스크립트
```
scripts/
├── build.sh                 # Docker 이미지 빌드
├── start_web.sh             # 웹 서버 시작
├── crawl.sh                 # CLI 크롤링
├── dev.sh                   # 개발 환경
├── setup_dirs.sh            # 디렉토리 설정
└── install.sh               # 전체 설치
```

### 📚 docs/ - 문서
```
docs/
├── START_HERE.md            # 🌟 시작 가이드
├── WEB_UI_GUIDE.md          # 웹 UI 사용법
├── README_NAS.md            # NAS 환경 설정
└── PROJECT_SUMMARY.md       # 기술 문서
```

### 🗂️ 기타 디렉토리
```
├── lib/                     # 유틸리티 (예약)
├── public/                  # 정적 파일
├── styles/                  # 추가 스타일
├── crawled_data/            # 크롤링 결과 (생성됨)
└── logs/                    # 로그 파일 (생성됨)
```

---

## 파일 역할

### 설정 파일
- `config.env` - 환경변수 설정
- `next.config.ts` - Next.js 설정
- `tsconfig.json` - TypeScript 설정
- `tailwind.config.ts` - Tailwind CSS 설정
- `postcss.config.mjs` - PostCSS 설정
- `.dockerignore` - Docker 빌드 제외
- `.gitignore` - Git 추적 제외

### 빌드 파일
- `Dockerfile` - Docker 이미지 정의
- `docker-compose.yml` - 서비스 정의
- `package.json` - Node.js 의존성
- `requirements.txt` - Python 의존성

---

## 디렉토리 역할

| 디렉토리 | 역할 | 파일 수 |
|----------|------|---------|
| `app/` | Next.js 앱 | ~10 |
| `components/` | UI 컴포넌트 | 3 |
| `logic/` | 크롤링 로직 | 3 |
| `scripts/` | 실행 스크립트 | 6 |
| `docs/` | 문서 | 4 |
| `crawled_data/` | 결과 저장 | 동적 |
| `logs/` | 로그 저장 | 동적 |

---

## 간소화된 구조의 장점

✅ **깔끔한 루트**
- 필수 파일만 루트에 위치
- 스크립트와 문서 분리

✅ **명확한 역할**
- 기능별 디렉토리 구분
- 쉬운 파일 찾기

✅ **유지보수 용이**
- 체계적인 구조
- 확장 가능한 설계

---

**깔끔하게 정리된 프로젝트 구조! 🎯**

