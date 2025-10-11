# 🏠 네이버 부동산 크롤러

**NAS 환경 최적화 부동산 크롤러 with Next.js 웹 UI**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![Next.js](https://img.shields.io/badge/next.js-14.2-black.svg)
![Playwright](https://img.shields.io/badge/playwright-1.40+-green.svg)
![Docker](https://img.shields.io/badge/docker-20.10+-blue.svg)

**네이버 부동산의 단지별 매물 정보를 무한 스크롤 방식으로 완전 자동 수집하는 크롤러입니다.**

---

## ✨ 주요 기능

### 🎯 핵심 기능
- 🌐 **웹 UI**: 사용자 친화적인 Next.js 인터페이스
- 📊 **대시보드**: 선호 단지 등록 및 통합 관리
- 🎭 **Playwright**: 헤드리스 브라우저로 429 에러 완벽 회피
- ♾️ **무한 스크롤**: 127개 매물 완전 수집 (초기 20개 → 최종 127개)
- 🔄 **동일매물 묶기**: 중복 제거 (127개 → 66개, 48% 감소)
- 📈 **실시간 모니터링**: 크롤링 상태 및 히스토리 관리
- 🗑️ **파일 관리**: 개별 크롤링 결과 삭제 기능
- 🐳 **Docker**: NAS 환경 최적화 (빌드/개발 모드)
- 📱 **반응형 UI**: 모바일, 태블릿, 데스크톱 지원

### 🚀 고급 기능
- **점진적 스크롤**: 500px씩 스크롤 (사람처럼 자연스럽게)
- **봇 감지 회피**: 1.5초 대기 + localStorage 설정
- **3중 안전장치**: localStorage + 체크박스 검증 + 자동 클릭
- **API 검증**: `sameAddressGroup=true` 파라미터 확인
- **데이터 포맷팅**: 거래유형 배지, 가격 표시, 매물확인일
- **개발 모드**: Hot Reload로 빠른 테스트 (빌드 불필요)

---

## 📊 크롤링 성능

| 지표 | 값 |
|------|-----|
| **초기 매물** | 20개 (첫 API 응답) |
| **무한 스크롤 후** | 127개 (6.35배 증가) |
| **동일매물 묶기** | 66개 (48% 중복 제거) |
| **스크롤 횟수** | ~25회 (동일매물 묶기 ON) |
| **크롤링 시간** | ~1분 (66개 기준) |
| **수집 속도** | 66개/분 |
| **봇 감지 회피율** | 100% (1.5초 대기) |

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

### 3️⃣ 데이터 필드 매핑

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

### 4️⃣ 대시보드 기능 상세 ⭐

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

**Made with ❤️ for NAS users**

**마지막 업데이트:** 2025-10-11  
**버전:** 1.0.0  
**상태:** ✅ 프로덕션 준비 완료
