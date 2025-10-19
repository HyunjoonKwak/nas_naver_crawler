# 🏠 네이버 부동산 크롤러

**NAS 환경 최적화 부동산 크롤러 with Next.js 웹 UI**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![Next.js](https://img.shields.io/badge/next.js-14.2-black.svg)
![Playwright](https://img.shields.io/badge/playwright-1.40+-green.svg)
![Docker](https://img.shields.io/badge/docker-20.10+-blue.svg)

---

## 🆕 최신 업데이트 (v2.7.0 - 2025-10-19)

### 🚀 Phase 3 진행: Analytics & Optimization

#### 🗄️ 데이터 구조 개선 (v2.7.0) ✅ 완료
- **성능 최적화**: 숫자 가격 컬럼 추가 (BigInt)
- **빠른 쿼리**: 가격/날짜 인덱스 추가
- **마이그레이션**: SQL 마이그레이션 + 데이터 변환 스크립트
- **성능 향상**: 정렬/필터링 속도 10배 개선

#### 📊 대시보드 분석 API (v2.7.0) ✅ 완료
- **통합 분석 API**: `/api/analytics/dashboard`
- **5가지 분석**:
  - 시장 개요 KPI (총 매물, 가격 통계)
  - 가격 추이 차트 (30일)
  - 단지별 TOP 10 랭킹
  - 거래 유형 분포 (매매/전세/월세)
  - 평형별 분석 (소/중/대/특대형)

### 🎉 Phase 2 완료: Core Features

#### 🔔 알림 설정 페이지 (v2.6.0) ✅ 완료
- **알림 관리 UI**: 알림 목록 조회, 생성, 삭제
- **맞춤 알림 설정**:
  - 단지별 알림 조건 (가격/면적/거래유형)
  - 알림 채널 선택 (브라우저/이메일/웹훅)
  - 활성화/비활성화 토글
- **투자 기회 자동 알림**: 조건에 맞는 매물 자동 감지 체계

#### ⏰ 24시간 매물 변동 추이 (v2.5.0) ✅ 완료
- **실시간 변동 모니터링**: 24시간 내 신규 매물 추가 감지
- **시각적 표시**:
  - Green 배지로 변동 수량 표시 (+N개)
  - Green border로 변동 있는 단지 하이라이트
- **카드/리스트 뷰 지원**: 양쪽 뷰 모두에서 변동 확인 가능
- **투자 기회 포착**: 활발한 거래 단지 즉시 파악

#### 🔍 고급 필터링 (v2.4.0) ✅ 완료
- **가격대 필터**: 전체/3억 이하/3-5억/5-10억/10억 이상
- **매물 수 필터**: 전체/매물 없음/1-10개/10-50개/50개 이상
- 필터 결과 카운트 표시
- 빈 결과 처리 및 초기화 기능

#### 📊 단지 비교 기능 (v2.4.0) ✅ 완료
- **비교 모드**: 단지 2-5개 선택 비교
- **비교 모달**: Side-by-side 테이블 형식
- **9개 항목 비교**:
  - 단지번호, 평균 가격, 가격 범위
  - 매물 수, 세대수, 동수, 주소
  - 최근 수집일, 거래 유형별 통계
- 시각적 선택 표시 (purple ring)

### 🎉 Phase 1 완료: Quick Wins

#### 📊 단지목록 페이지 가격 정보 강화 (v2.2.0)
- 가격 통계 시스템 (평균/최저/최고)
- 5개 KPI 대시보드
- 카드/리스트 뷰 가격 정보 추가
- 거래 유형별 통계

#### 🚀 랜딩 페이지 최적화 (v2.3.0)
- **실시간 통계 표시**
  - 등록 매물 수, 관리 단지 수, 평균 업데이트 시간
- **기능 카드 축소** (6개 → 3개 핵심)
  - 자동 크롤링, 실시간 분석, 가격 추적
- **회원가입 CTA 강화**
  - 박스형 CTA + "무료로 시작하기" 버튼

#### 🎉 커뮤니티 시스템 (v2.1.0)
- 게시판 (자유게시판, Q&A, 공지사항)
- 댓글 & 대댓글, 북마크, 좋아요
- 신고 시스템 및 관리자 페이지

#### 🔧 크롤러 안정성 (v2.1.0)
- 컨텍스트 에러 자동 복구
- 스마트 컨테이너 감지
- 스케줄러 타임아웃 개선

**전체 변경 이력**: [CHANGELOG.md](CHANGELOG.md)
**향후 계획**: [TODO.md](TODO.md)
**효율성 분석**: [ANALYSIS_REPORT.md](ANALYSIS_REPORT.md)

---

## ⚠️ 중요: 현재 개발 모드 운영 중

**🔴 별도 지시가 있을 때까지 개발 모드를 유지합니다.**

- ✅ Hot Reload 활성화 (코드 변경 시 3초 내 자동 반영)
- ✅ 빠른 배포 (`git pull` + `docker-compose restart web` = 8초)
- ❌ **프로덕션 모드로 변경 금지**

**정책 문서:** [`/docs/DEVELOPMENT_POLICY.md`](/docs/DEVELOPMENT_POLICY.md)

**빠른 배포:**
```bash
cd /volume1/docker/naver-crawler
git pull origin main
docker-compose restart web  # 3초 완료!
```

- NAS 에서 돌아가는 프로젝트 이므로 로컬에서 데이터베이스 검색은 하지 마시오.
---

**네이버 부동산의 단지별 매물 정보를 무한 스크롤 방식으로 완전 자동 수집하는 크롤러입니다.**

---

## ✨ 주요 기능

### 🎯 핵심 기능
- 🌐 **웹 UI**: 사용자 친화적인 Next.js 인터페이스
- 📊 **대시보드**: 선호 단지 등록 및 통합 관리
- 🗺️ **역지오코딩**: 위도/경도 → 주소/법정동/행정동 자동 변환
- 🎭 **Playwright**: 헤드리스 브라우저로 429 에러 완벽 회피
- ♾️ **무한 스크롤**: 127개 매물 완전 수집 (초기 20개 → 최종 127개)
- 🔄 **동일매물 묶기**: 중복 제거 (127개 → 66개, 48% 감소)
- 📈 **실시간 모니터링**: 크롤링 상태 및 히스토리 관리
- 🗑️ **파일 관리**: 개별 크롤링 결과 삭제 기능
- 🐳 **Docker**: NAS 환경 최적화 (빌드/개발 모드)
- 📱 **반응형 UI**: 모바일, 태블릿, 데스크톱 지원

### 🚀 고급 기능
- **점진적 스크롤**: 800px씩 스크롤 (최적화됨, 이전 500px)
- **동적 대기 시간**: API 패턴 기반 (0.3s/1.0s)
- **봇 감지 회피**: 동적 대기 + localStorage 설정
- **3중 안전장치**: localStorage + 체크박스 검증 + 자동 클릭
- **API 검증**: `sameAddressGroup=true` 파라미터 확인
- **데이터 포맷팅**: 거래유형 배지, 가격 표시, 매물확인일
- **개발 모드**: Hot Reload로 빠른 테스트 (빌드 불필요)

---

## 📊 크롤링 성능 (v1.1.0 - 2025-10-12)

### 최적화 결과 ⚡
```
원본:  8분 37초 (516,854ms)
현재:  4분 12초 (251,633ms)
개선:  -51.3% 🚀
```

### 성능 지표
| 지표 | 값 | 개선 |
|------|-----|------|
| **크롤링 시간** | 4분 12초 (5개 단지) | -51.3% |
| **처리 속도** | 0.99 매물/초 | +106% |
| **스크롤 효율** | 3.57 매물/스크롤 | +53% |
| **초기 매물** | 20개 (첫 API 응답) | - |
| **무한 스크롤 후** | 127개 (6.35배 증가) | - |
| **동일매물 묶기** | 66개 (48% 중복 제거) | - |
| **스크롤 횟수** | ~17회 (동일매물 묶기 ON) | -35% |
| **봇 감지 회피율** | 100% (동적 대기) | - |

### 적용된 최적화
- ✅ **domcontentloaded 전환**: 초기 로딩 5-10초 단축
- ✅ **동적 대기 시간**: API 패턴 기반 (0.3s/1.0s)
- ✅ **스크롤 거리 증가**: 500px → 800px
- ✅ **빠른 종료 조건**: 8회 → 3회

**상세 문서**: [PERFORMANCE.md](docs/PERFORMANCE.md)

---

## 🚀 빠른 시작

### 1️⃣ 관리 메뉴 (가장 쉬운 방법)

```bash
./manage.sh
```

**메뉴 옵션:**
```
=== 프로덕션 모드 ===
1) 🚀 웹서버 시작
2) 🛑 웹서버 종료
3) 🔄 웹서버 재시작
6) 🔧 빌드

=== 개발 모드 (빠른 테스트) ===
8) ⚡ 개발 모드 시작 (빌드 불필요)
9) 🛑 개발 모드 종료

=== 공통 ===
4) 📊 상태 확인
5) 📝 로그 확인
7) 🗑️  데이터 정리
```

### 2️⃣ 웹 브라우저 접속

```
http://NAS_IP:3000
```

### 3️⃣ 크롤링 실행

#### 📋 메인 페이지에서 일회성 크롤링
1. **단지번호 입력** (예: `22065`)
2. **크롤링 시작 버튼 클릭**
3. **결과 확인**: 크롤링 히스토리에서 상세 정보 보기

#### 📊 대시보드에서 선호 단지 관리
1. **대시보드 이동**: 상단 우측 "📊 대시보드" 버튼 클릭
2. **단지 추가**: "➕ 단지 추가" 클릭 → 단지번호 입력
3. **매물 수집**:
   - **개별 크롤링**: 단지 카드의 🔄 버튼 클릭
   - **전체 크롤링**: "🔄 전체 크롤링" 버튼 클릭
4. **상세 보기**: "📋 상세보기" 버튼으로 단지정보 + 매물목록 확인
5. **단지 삭제**: 🗑️ 버튼으로 선호 단지 목록에서 제거

**대시보드 장점:**
- ✅ 여러 단지를 한 곳에서 관리
- ✅ 단지별 마지막 수집 시간 추적
- ✅ 매물 수 통계 실시간 확인
- ✅ 원클릭 크롤링 (단지별/전체)

---

## 🛠️ 설치 및 배포

### 프로덕션 모드 (안정적)

```bash
# 1. 저장소 클론
git clone <repository_url>
cd nas_naver_crawler

# 2. 빌드 및 시작
./manage.sh
# → 6번 (빌드)
# → 1번 (웹서버 시작)

# 3. 브라우저 접속
# http://NAS_IP:3000
```

### 개발 모드 (빠른 테스트)

```bash
# 1. 개발 모드 시작 (빌드 불필요, Hot Reload)
./manage.sh
# → 8번 (개발 모드 시작)

# 2. 코드 수정 후 자동 반영
# 파일 변경 → 자동 재컴파일 → 브라우저 새로고침
```

---

## 📖 상세 문서

| 문서 | 설명 |
|------|------|
| [👉 START_HERE.md](docs/START_HERE.md) | **여기서 시작하세요!** |
| [🌐 WEB_UI_GUIDE.md](docs/WEB_UI_GUIDE.md) | 웹 UI 사용 가이드 |
| [📁 STRUCTURE.md](docs/STRUCTURE.md) | 프로젝트 구조 |
| [⚡ QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md) | 빠른 배포 (개발 모드) |
| [🎉 FINAL_SUMMARY.md](docs/FINAL_SUMMARY.md) | 완성 요약 |
| [🔧 README_NAS.md](docs/README_NAS.md) | NAS 환경 설정 |
| [📊 PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md) | 기술 문서 |

---

## 🎯 핵심 기술

### 1️⃣ 무한 스크롤 크롤링

**참고:** [crawler_service.py 방식](https://github.com/example/crawler_service.py)

```python
# 점진적 스크롤 (500px씩)
container.scrollTop += 500

# 봇 감지 회피
await asyncio.sleep(1.5)

# API 응답 자동 수집
page.on('response', handle_articles_response)
```

**작동 원리:**
1. `.item_list` 컨테이너 발견
2. 500px씩 점진적 스크롤
3. 1.5초 대기 (자연스러운 사용자 행동)
4. 네이버 API 응답 자동 수집
5. 스크롤 끝 감지 (5회 연속)

### 2️⃣ 동일매물 묶기

**3중 안전장치:**

```python
# Layer 1: localStorage 사전 설정 (가장 확실)
await page.goto("https://new.land.naver.com")
await page.evaluate('''
    localStorage.setItem('sameAddrYn', 'true')
    localStorage.setItem('sameAddressGroup', 'true')
''')

# Layer 2: 체크박스 상태 검증
checkbox_state = await page.evaluate('...')

# Layer 3: 체크박스 자동 클릭
if not checked:
    await checkbox.click()
```

**효과:**
- 127개 → 66개 (48% 중복 제거)
- 같은 동/호수의 여러 중개소 매물 → 1개로 통합
- 최저가 자동 선택

### 3️⃣ 역지오코딩 (Reverse Geocoding) ⭐

**네이버 Maps API 활용:**

```typescript
// 위도/경도 → 주소 변환
GET /api/geocode?latitude=37.202662&longitude=127.066003

Response:
{
  "fullAddress": "경기도 화성시 동탄반석로 22",
  "roadAddress": "경기도 화성시 동탄반석로 22",
  "jibunAddress": "경기도 화성시 반송동 150",
  "beopjungdong": "반송동",    // 법정동
  "haengjeongdong": "반송동"   // 행정동
}
```

**자동 표시 위치:**
- 대시보드 → 단지 상세 모달 헤더
- 크롤링 히스토리 → 상세보기 모달 (위치 정보 카드)

**UI 표현:**
```
📍 경기도 화성시 동탄반석로 22
[법정동: 반송동] [행정동: 반송동]
```

**설정 방법:**
1. https://www.ncloud.com/ 접속
2. Console → AI·NAVER API
3. Application 등록 → Maps → Reverse Geocoding 활성화
4. `config.env`에 Client ID/Secret 입력
5. Docker 재시작

### 4️⃣ 데이터 필드 매핑

| UI 표시 | API 필드명 | 형식 |
|---------|-----------|------|
| 거래유형 | `tradeTypeCode` | A1(매매), B1(전세), B2(월세) |
| 가격 | `dealOrWarrantPrc` | "7억 6,000" (문자열) |
| 보증금 | `dealOrWarrantPrc` | 월세용 |
| 월세 | `rentPrc` | 월세용 |
| 면적 | `area1` | 숫자 (㎡) |
| 층 | `floorInfo` | "26/32" (현재/전체) |
| 방향 | `direction` | "남동향" |
| 매물확인일 | `articleConfirmYmd` | "20251011" |

### 5️⃣ 대시보드 기능 상세 ⭐

#### 선호 단지 관리
```
📊 대시보드
├── ➕ 단지 추가
│   └── 단지번호 + 단지명 입력
├── 🔄 전체 크롤링
│   └── 등록된 모든 단지 일괄 수집
└── 단지 카드 (Grid Layout)
    ├── 단지명 / 단지번호
    ├── 등록일 / 마지막 수집일
    ├── 매물 수 통계
    └── 액션 버튼
        ├── 📋 상세보기 (모달)
        ├── 🔄 개별 크롤링
        └── 🗑️ 삭제
```

#### 단지 상세 모달
```
┌─────────────────────────────────────┐
│ 동탄시범다은마을월드메르디앙...  ✕  │
│ 단지번호: 22065                      │
│ 📍 경기도 화성시 동탄반석로 22      │ ⭐ 자동 주소 조회
│ [법정동: 반송동] [행정동: 반송동]   │
├─────────────────────────────────────┤
│ 📋 단지 정보                         │
│  세대수 | 동수 | 승인일 | 가격범위  │
│                                      │
│ 🏘️ 매물 목록 (테이블)               │
│  거래유형 | 가격 | 면적 | 동 | 층   │
│  ─────────────────────────────────  │
│  [매매] 7억 6,000 | 81㎡ | 1001동... │
│  [전세] 4억 8,000 | 81㎡ | 1002동... │
│  [월세] 5,000/240 | 59㎡ | 1003동... │
└─────────────────────────────────────┘
```

#### 크롤링 히스토리 (파일 관리)
```
크롤링 히스토리
├── 🔄 새로고침
└── 히스토리 카드 (최신순)
    ├── 단지명 / 단지번호
    ├── 크롤링 일시 (KST)
    ├── 파일명 / 파일크기
    └── 액션 버튼
        ├── 📋 상세보기 (모달) ← 클릭
        └── 🗑️ 삭제 (JSON + CSV) ← 클릭
```

**주요 기능:**
- ✅ 즐겨찾기 단지 목록 관리 (`favorites.json`)
- ✅ 단지별 마지막 수집 시간 자동 추적
- ✅ 매물 수 실시간 통계 (동일매물 묶기 적용)
- ✅ 원클릭 단지별/전체 크롤링
- ✅ 모달로 단지 정보 + 매물 목록 통합 표시
- ✅ 크롤링 결과 파일 개별 삭제
- ✅ **역지오코딩 자동 주소 조회** (네이버 Maps API) ⭐

---

## 📁 프로젝트 구조

```
nas_naver_crawler/
├── ⚙️ manage.sh                    # 통합 관리 메뉴
├── 📄 README.md                    # 이 문서
│
├── 📂 app/                         # Next.js 앱
│   ├── api/
│   │   ├── crawl/route.ts         # 크롤링 API
│   │   ├── results/route.ts       # 결과 조회/삭제 API ⭐
│   │   ├── favorites/route.ts     # 선호 단지 관리 API ⭐
│   │   ├── geocode/route.ts       # 역지오코딩 API ⭐
│   │   └── status/route.ts        # 상태 확인 API
│   ├── dashboard/
│   │   └── page.tsx               # 대시보드 페이지 ⭐
│   ├── layout.tsx
│   ├── page.tsx                   # 메인 페이지
│   └── globals.css
│
├── 📂 components/                  # React 컴포넌트
│   ├── CrawlerForm.tsx            # 크롤링 입력 폼
│   ├── CrawlerHistory.tsx         # 결과 히스토리 (삭제 기능 포함) ⭐
│   ├── CrawlerStatus.tsx          # 상태 표시
│   └── PropertyDetail.tsx         # 매물 상세보기 ⭐
│
├── 📂 logic/                       # Python 크롤링 엔진
│   ├── nas_playwright_crawler.py  # 메인 크롤러 ⭐
│   ├── scheduler.py               # 스케줄러
│   └── simple_crawler.py          # 간단 크롤러
│
├── 📂 scripts/                     # 실행 스크립트
│   ├── start.sh                   # 프로덕션 시작
│   ├── stop.sh                    # 서비스 종료
│   ├── dev.sh                     # 개발 모드 (래퍼)
│   ├── build.sh                   # 빌드
│   └── crawl.sh                   # CLI 크롤링
│
├── 📂 docs/                        # 문서
│   ├── START_HERE.md
│   ├── QUICK_DEPLOY.md            # 개발 모드 가이드 ⭐
│   └── ...
│
├── 📂 crawled_data/                # 크롤링 결과 (JSON, CSV)
├── 📂 logs/                        # 로그 파일
│
├── 🐳 Dockerfile                   # 프로덕션 이미지
├── 🐳 docker-compose.yml          # 프로덕션 설정
├── 🐳 docker-compose.dev.yml      # 개발 모드 설정 ⭐
├── ⚙️ config.env                  # 환경 변수
├── 📦 package.json                # Node.js 의존성
├── 🐍 requirements.txt            # Python 의존성
└── 🎨 tailwind.config.js          # Tailwind CSS 설정
```

---

## 🔧 시스템 요구사항

### 최소 사양
- **CPU**: 2코어
- **RAM**: 2GB
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Disk**: 5GB (빌드 캐시 포함)

### 권장 사양
- **CPU**: 4코어
- **RAM**: 4GB
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Disk**: 10GB

### NAS 호환성
- ✅ Synology DSM 7.0+
- ✅ QNAP QTS 5.0+
- ✅ 기타 Docker 지원 NAS

---

## 📊 출력 데이터

### 저장 위치
```
./crawled_data/
├── complexes_1_20251011_140507.json  # 크롤링 결과
├── complexes_1_20251011_140507.csv   # 크롤링 결과 (CSV)
└── favorites.json                     # 선호 단지 목록 ⭐
```

### JSON 구조
```json
[
  {
    "crawling_info": {
      "complex_no": "22065",
      "crawling_date": "2025-10-11T14:05:07",
      "crawler_version": "1.0.0"
    },
    "overview": {
      "complexName": "동탄시범다은마을...",
      "totalHouseHoldCount": 1473,
      "minPrice": 58500,
      "maxPrice": 96000
    },
    "articles": {
      "articleList": [
        {
          "articleNo": "2554481918",
          "tradeTypeCode": "A1",
          "dealOrWarrantPrc": "7억 6,000",
          "area1": 99,
          "floorInfo": "26/32",
          "articleConfirmYmd": "20251011",
          "sameAddrCnt": 3
        }
      ],
      "totalCount": 66
    }
  }
]
```

---

## 🎨 웹 UI 기능

### 1️⃣ 크롤링 폼
- 단지번호 입력 (예: 22065)
- 크롤링 시작 버튼
- 실시간 로딩 상태

### 2️⃣ 크롤링 히스토리
- 크롤링 날짜/시간
- 단지명
- 매물 개수
- 상세보기 버튼

### 3️⃣ 매물 상세보기 (PropertyDetail)
**탭 1: 단지 정보**
- 기본 정보 (세대수, 동수, 사용승인일)
- 면적 정보 (최소/최대)
- 가격 정보 (최저가/최고가)
- 위치 정보 (위도/경도)

**탭 2: 매물 목록**
- 거래유형 배지 (🔵 매매, 🟢 전세, 🟡 월세)
- 가격 (월세는 보증금/월세 분리)
- 면적 (㎡ + 평)
- 층수
- 방향
- 매물확인일

---

## 🤖 봇 감지 회피 전략

### 1️⃣ localStorage 사전 설정
```javascript
localStorage.setItem('sameAddrYn', 'true')
localStorage.setItem('sameAddressGroup', 'true')
```

### 2️⃣ 자연스러운 스크롤
- 500px씩 점진적 스크롤 (한 번에 끝까지 X)
- 1.5초 대기 (사람의 스크롤 속도)

### 3️⃣ Headless 브라우저
- Playwright Chromium
- User-Agent 설정
- 쿠키/세션 관리

### 4️⃣ API 응답 모니터링
- 네트워크 요청 감지
- JSON 자동 파싱
- 중복 제거

---

## 🔍 디버깅 및 로그

### 실시간 로그 확인
```bash
# 프로덕션 모드
docker-compose logs -f web

# 개발 모드
docker-compose -f docker-compose.dev.yml logs -f web

# 또는 manage.sh 사용
./manage.sh
# → 5번 (로그 확인)
```

### 주요 로그 메시지
```
✅ 성공 로그
🔧 설정 로그
[DEBUG] 디버깅 로그
⚠️ 경고 로그
❌ 에러 로그
```

### 로그 예시
```
🔧 동일매물 묶기 설정 준비 중...
✅ localStorage 설정 완료
[DEBUG] API 호출 감지 (동일매물묶기: ✅ ON)
  → 20개 새 매물 추가 (총 20개, 전체: 66건)
시도 1회: +500px 스크롤 → 20개 추가 (총 40개)
🎉 수집 완료: 초기 20개 → 최종 66개
```

---

## 🚧 향후 추천 기능

### 1️⃣ 자동 스케줄링
**목적:** 매일 정해진 시간에 자동 크롤링

**구현 방법:**
```bash
# crontab 등록
crontab -e

# 매일 오전 9시에 크롤링
0 9 * * * curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"complexNumbers": ["22065", "12345", "67890"]}'
```

**필요 작업:**
- [ ] 스케줄 설정 UI 추가
- [ ] 크롤링 큐 시스템 구현
- [ ] 실패 시 재시도 로직

### 2️⃣ 여러 단지 동시 크롤링
**목적:** 한 번에 여러 단지 크롤링

**구현 방법:**
```typescript
// CrawlerForm.tsx에서
complexNumbers: string[] // "22065, 12345, 67890"

// Python에서 병렬 처리
async def crawl_multiple(complex_nos: List[str]):
    tasks = [crawl_complex(no) for no in complex_nos]
    await asyncio.gather(*tasks)
```

**필요 작업:**
- [ ] 입력 폼 수정 (여러 단지번호)
- [ ] 병렬 크롤링 로직
- [ ] 진행률 표시 (3/10 완료)

### 3️⃣ 가격 변동 추적
**목적:** 같은 단지의 가격 변화 모니터링

**구현 방법:**
```python
# 데이터베이스에 저장
class PriceHistory:
    article_no: str
    price: int
    crawled_at: datetime
    
# 가격 변화 계산
price_change = current_price - previous_price
change_rate = (price_change / previous_price) * 100
```

**필요 작업:**
- [ ] 데이터베이스 연동 (SQLite/PostgreSQL)
- [ ] 가격 히스토리 테이블
- [ ] 변동률 계산 로직
- [ ] 그래프 UI (Chart.js)

### 4️⃣ 알림 기능
**목적:** 특정 조건 만족 시 알림

**구현 방법:**
```python
# 조건 설정
alert_config = {
    "complex_no": "22065",
    "trade_type": "A1",  # 매매
    "max_price": 70000,  # 7억 이하
    "min_area": 85       # 85㎡ 이상
}

# 텔레그램/이메일 알림
if matches_condition(article, alert_config):
    send_telegram_message(...)
```

**필요 작업:**
- [ ] 알림 조건 설정 UI
- [ ] 텔레그램 봇 연동
- [ ] 이메일 알림 (SMTP)
- [ ] 웹훅 지원

### 5️⃣ 데이터 분석 기능
**목적:** 매물 데이터 통계 및 시각화

**구현 항목:**
- 평균 가격 계산
- 층별 가격 분포
- 평형별 가격 비교
- 거래유형별 통계
- 가격 추세 그래프

**필요 작업:**
- [ ] 통계 API 엔드포인트
- [ ] 차트 컴포넌트 (Chart.js/Recharts)
- [ ] 대시보드 페이지
- [ ] CSV 다운로드 개선

### 6️⃣ 매물 비교 기능
**목적:** 여러 매물을 나란히 비교

**구현 방법:**
```tsx
<CompareTable articles={selectedArticles} />
// 가격, 면적, 층, 방향을 표로 비교
```

**필요 작업:**
- [ ] 체크박스로 매물 선택
- [ ] 비교 테이블 컴포넌트
- [ ] 최대 5개 비교 제한

### 7️⃣ 필터 및 정렬
**목적:** 매물 목록 필터링 및 정렬

**필터 옵션:**
- 거래유형 (매매/전세/월세)
- 가격 범위
- 면적 범위
- 층수 범위

**정렬 옵션:**
- 가격 오름차순/내림차순
- 면적 오름차순/내림차순
- 최신순/오래된순

**필요 작업:**
- [ ] 필터 UI 컴포넌트
- [ ] 정렬 드롭다운
- [ ] 필터링 로직 (클라이언트)

---

## 🐛 문제 해결

### 1️⃣ 크롤링이 20개에서 멈춤
**원인:** 스크롤이 작동하지 않음

**해결:**
```bash
# 로그 확인
docker-compose logs web | grep "스크롤"

# [DEBUG] 로그에서 scrollHeight, clientHeight 확인
# moved: false → 스크롤 실패
```

### 2️⃣ 동일매물 묶기가 안 됨 (여전히 127개)
**원인:** localStorage 설정 실패

**해결:**
```bash
# 로그 확인
docker-compose logs web | grep "동일매물"

# 체크박스 상태 확인
# checked: false → 체크박스 클릭 실패
```

### 3️⃣ 가격이 "NaN 억"으로 표시됨
**원인:** 필드명 불일치

**해결:**
```json
// 데이터 확인
{
  "dealOrWarrantPrc": "7억 6,000"  // 문자열로 저장됨
}

// formatPrice 함수가 문자열도 처리하는지 확인
```

### 4️⃣ Docker 메모리 부족
**해결:**
```yaml
# docker-compose.yml
services:
  web:
    mem_limit: 4g  # 2g → 4g로 증가
    memswap_limit: 4g
```

---

## 📝 개발 가이드

### 코드 수정 후 테스트

**개발 모드 (권장):**
```bash
# 1. 개발 모드 시작
./manage.sh → 8번

# 2. 코드 수정

# 3. 자동 재컴파일 (Hot Reload)
# 브라우저에서 새로고침만 하면 됨
```

**프로덕션 모드:**
```bash
# 1. 코드 수정

# 2. 재빌드
./manage.sh → 6번

# 3. 재시작
./manage.sh → 3번
```

### Git 워크플로우

```bash
# 1. 개발 브랜치 생성
git checkout -b feature/new-feature

# 2. 코드 수정 및 커밋
git add .
git commit -m "Add new feature"

# 3. 푸시
git push origin feature/new-feature

# 4. Pull Request 생성
```

---

## 📄 라이선스

MIT License - 교육 및 연구 목적으로 자유롭게 사용하세요.

**주의사항:**
- 네이버 부동산 이용약관 준수
- 크롤링 간격 준수 (1.5초 이상)
- 상업적 사용 시 별도 검토 필요

---

## 🙏 감사의 말

- **Playwright**: 안정적인 헤드리스 브라우저
- **Next.js**: 강력한 React 프레임워크
- **Docker**: NAS 환경 최적화
- **crawler_service.py**: 무한 스크롤 구현 참고

---

## 📞 문의 및 지원

- **Issues**: GitHub Issues 활용
- **Discussions**: GitHub Discussions 활용
- **Email**: (optional)

---

## 📁 프로젝트 구조

```
nas_naver_crawler/
├── README.md              # 프로젝트 메인 문서
├── TODO.md                # 개발 로드맵 및 체크리스트
├── Dockerfile             # Docker 이미지 정의
├── docker-compose.yml     # 서비스 구성
├── package.json           # Node.js 의존성
├── requirements.txt       # Python 의존성
│
├── app/                   # Next.js 애플리케이션
│   ├── api/              # API 라우트 (crawl, results, status)
│   ├── complex/[complexNo]/ # 단지 상세 페이지
│   ├── complexes/        # 단지 목록 페이지
│   ├── layout.tsx        # 루트 레이아웃
│   └── page.tsx          # 메인 대시보드
│
├── components/           # React 컴포넌트
│   ├── CrawlerForm.tsx   # 크롤링 입력 폼
│   ├── CrawlerHistory.tsx # 히스토리 테이블
│   ├── CrawlerStatus.tsx # 시스템 상태 모니터링
│   ├── ComplexTable.tsx  # 단지 목록 테이블
│   ├── PropertyDetail.tsx # 매물 상세 정보
│   └── RealPriceAnalysis.tsx # 실거래가 분석 차트
│
├── logic/                # Python 크롤링 로직
│   ├── nas_playwright_crawler.py # Playwright 크롤러 (메인)
│   ├── simple_crawler.py # 간단한 크롤러 (백업)
│   └── scheduler.py      # 스케줄러 (예약)
│
├── scripts/              # 실행 스크립트
│   ├── start_web.sh      # 웹 서버 시작
│   ├── crawl.sh          # CLI 크롤링
│   ├── build.sh          # Docker 빌드
│   └── dev.sh            # 개발 모드
│
├── docs/                 # 문서
│   ├── GETTING_STARTED.md # 🌟 시작 가이드 (필독)
│   ├── PROJECT_SUMMARY.md # 기술 문서
│   ├── PERFORMANCE.md    # 성능 최적화 가이드
│   ├── CHANGELOG.md      # 변경 이력
│   ├── README_NAS.md     # NAS 환경 설정
│   └── QUICK_DEPLOY.md   # 빠른 배포 가이드
│
├── crawled_data/         # 크롤링 결과 (자동 생성)
└── logs/                 # 로그 파일 (자동 생성)
```

### 주요 디렉토리 역할

| 디렉토리 | 역할 | 주요 파일 |
|----------|------|-----------|
| `app/` | Next.js App Router | page.tsx, layout.tsx, API routes |
| `components/` | UI 컴포넌트 | CrawlerForm, History, Status |
| `logic/` | 크롤링 엔진 | nas_playwright_crawler.py |
| `scripts/` | 실행 스크립트 | start_web.sh, crawl.sh |
| `docs/` | 문서 | GETTING_STARTED, PERFORMANCE |

---

## 📚 문서 가이드

### 처음 시작하시나요?
1. **[GETTING_STARTED.md](docs/GETTING_STARTED.md)** ⭐ 필독 - 웹 UI 사용법 완벽 가이드
2. **[README_NAS.md](docs/README_NAS.md)** - NAS 환경 설정 (Synology, QNAP)
3. **[QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md)** - 빠른 배포 (Mac → NAS, 개발 모드)

### 개발자이신가요?
1. **[TODO.md](TODO.md)** - 개발 로드맵 및 작업 계획
2. **[PERFORMANCE.md](docs/PERFORMANCE.md)** - 성능 최적화 상세 가이드
3. **[CHANGELOG.md](docs/CHANGELOG.md)** - 버전별 변경 이력
4. **[PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)** - 기술 스택 및 아키텍처

### 문서 읽는 순서
```
신규 사용자:
  README.md → GETTING_STARTED.md → (웹 UI 사용)

NAS 사용자:
  README.md → README_NAS.md → GETTING_STARTED.md

개발자:
  README.md → PROJECT_SUMMARY.md → PERFORMANCE.md → TODO.md
```

---

**Made with ❤️ for NAS users**

**마지막 업데이트:** 2025-10-12
**버전:** 1.1.0 (성능 최적화 완료)
**상태:** ✅ 프로덕션 준비 완료 + 51.3% 속도 개선
