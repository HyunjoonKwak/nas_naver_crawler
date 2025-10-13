# 🔄 시스템 마이그레이션 완료 노트

**날짜**: 2025-10-13
**버전**: v1.2.0
**변경 사항**: JSON 파일 시스템 → 완전한 DB 기반 시스템

---

## 📋 변경 요약

### 문제점
- JSON 파일 시스템과 PostgreSQL DB가 혼재되어 작동
- Python 크롤러는 파일에만 상태 저장
- 프론트엔드는 DB를 폴링
- **결과**: 실시간 진행률 표시 불가능, 상태 불일치

### 해결 방법
Python 크롤러가 **직접 PostgreSQL DB에 실시간 상태를 저장**하도록 수정

---

## ✅ 수정된 파일 목록

### 1. Python 크롤러 (핵심 변경)
- **`logic/nas_playwright_crawler.py`**
  - `psycopg2` 연동 추가
  - `crawl_id` 파라미터 추가
  - `update_status()` → DB 실시간 업데이트
  - Docker 환경 자동 감지

### 2. 의존성 및 Docker
- **`requirements.txt`** → `psycopg2-binary==2.9.9` 추가
- **`Dockerfile`** → `libpq-dev` 추가
- **`Dockerfile.dev`** → `libpq-dev` 추가

### 3. Next.js API
- **`app/api/crawl/route.ts`**
  - Python 실행 시 `crawl_id` 전달
  - 타임아웃 15분 → **30분**

### 4. 제거된 파일
- **`app/api/crawl-state/route.ts`** → `route.ts.backup`으로 백업
  - 파일 기반 상태 API 제거
  - 이제 `/api/crawl-status`만 사용 (DB 기반)

### 5. 프론트엔드
- **`app/complexes/page.tsx`**
  - 파일 폴링 로직 제거 (`checkServerCrawlState()`)
  - DB 기반 폴링만 사용

---

## 🔄 시스템 동작 흐름 (변경 후)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. 사용자가 크롤링 시작 버튼 클릭                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. POST /api/crawl                                            │
│    - CrawlHistory DB에 레코드 생성 (crawl_id 발급)            │
│    - Python 크롤러 실행: python3 ... "${crawl_id}"            │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Python 크롤러 (nas_playwright_crawler.py)                  │
│    - PostgreSQL DB 연결 (psycopg2)                            │
│    - 크롤링 진행 중 update_status() 호출                      │
│    - ✅ DB에 실시간 업데이트:                                  │
│      • current_step: "Crawling complex 22065..."             │
│      • processed_complexes: 1                                │
│      • processed_articles: 127                               │
│      • duration: 45 (초)                                     │
│      • status: 'crawling' | 'success' | 'failed'             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. 프론트엔드 (CrawlerForm.tsx, complexes/page.tsx)           │
│    - 2초마다 GET /api/crawl-status?crawlId={id} 폴링         │
│    - ✅ DB에서 실시간 진행률 조회                              │
│    - 진행률 바 및 상태 메시지 업데이트                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 주요 개선 사항

### 1. 실시간 진행률 표시 ✅
- **Before**: Python이 파일에만 저장 → 프론트엔드가 읽지 못함
- **After**: Python이 DB에 저장 → 프론트엔드가 실시간 조회

### 2. 상태 일관성 보장 ✅
- **Before**: 파일 vs DB 상태 불일치
- **After**: 단일 소스 (DB)만 사용

### 3. 확장성 개선 ✅
- **Before**: 파일 I/O 경쟁 상태 가능
- **After**: DB 트랜잭션으로 안전한 동시성 제어

### 4. 타임아웃 증가 ✅
- **Before**: 15분 (짧음)
- **After**: 30분 (여유)

---

## 🚀 배포 방법

### ⚠️ 이번 배포는 의존성 변경이 있으므로 --no-cache 필수!

**NAS 환경 - 의존성 변경 배포:**
```bash
cd /volume1/docker/naver-crawler
git pull origin main

# 기존 컨테이너 중지
docker-compose down

# 캐시 없이 새로 빌드 (psycopg2, libpq-dev 설치)
docker-compose build --no-cache

# 컨테이너 시작
docker-compose up -d
```

**또는 한 줄로:**
```bash
cd /volume1/docker/naver-crawler && git pull origin main && docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

**이후 코드만 변경된 경우 (Hot Reload 모드):**
```bash
cd /volume1/docker/naver-crawler
git pull origin main
docker-compose restart web  # 3초 완료!
```

---

## ⚠️ 주의사항

### 1. DATABASE_URL 환경변수 필수
Python 크롤러가 DB에 연결하려면 `DATABASE_URL`이 설정되어 있어야 합니다.

**Docker Compose** (docker-compose.yml):
```yaml
environment:
  - DATABASE_URL=postgresql://crawler_user:crawler_pass_2025@db:5432/naver_crawler
```

### 2. psycopg2 의존성 ⚠️ 중요!
- **반드시 `--no-cache` 옵션으로 빌드 필요**
- 새로운 시스템 패키지: `libpq-dev`
- 새로운 Python 패키지: `psycopg2-binary==2.9.9`
- 캐시를 사용하면 설치되지 않아 에러 발생!

### 3. 호환성
- 기존 JSON 파일은 그대로 유지 (백업용)
- DB가 없어도 파일 모드로 폴백 가능 (경고 메시지만 표시)

---

## 🧪 테스트 방법

### 1. 로컬 테스트
```bash
# Prisma 클라이언트 생성
npx prisma generate

# DB 마이그레이션 (이미 완료되어 있음)
npx prisma migrate dev

# 개발 서버 실행
npm run dev
```

### 2. 크롤링 테스트
1. http://localhost:3000 접속
2. 단지 번호 입력 (예: 22065)
3. 크롤링 시작 버튼 클릭
4. **실시간 진행률 확인** ✅
   - 진행률 바가 실시간으로 업데이트되는지 확인
   - "Crawling complex..." 메시지 확인
   - 수집 매물 수 증가 확인

### 3. DB 확인
```bash
# Prisma Studio로 DB 확인
npx prisma studio

# 또는 PostgreSQL 직접 접속
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler
SELECT * FROM crawl_history ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 Before & After 비교

| 항목 | Before (파일 기반) | After (DB 기반) |
|------|-------------------|----------------|
| **진행률 표시** | ❌ 불가능 | ✅ 실시간 |
| **상태 일관성** | ❌ 파일/DB 불일치 | ✅ 단일 소스 |
| **동시성 제어** | ❌ 파일 경쟁 상태 | ✅ DB 트랜잭션 |
| **확장성** | ❌ 파일 I/O 병목 | ✅ DB 확장 가능 |
| **타임아웃** | 15분 | 30분 |
| **데이터 소스** | 파일 + DB (혼재) | DB 단일화 |

---

## 🔍 문제 해결

### 1. "DB 연결 실패" 경고
```
[WARNING] DB 연결 실패: could not connect to server
```

**원인**: DATABASE_URL이 잘못되었거나 DB 컨테이너가 실행 중이 아님

**해결**:
```bash
# DB 컨테이너 상태 확인
docker ps | grep postgres

# DB 컨테이너 재시작
docker-compose restart db

# DATABASE_URL 확인
docker exec naver-crawler-web env | grep DATABASE_URL
```

### 2. "psycopg2 모듈 없음" 에러
```
ModuleNotFoundError: No module named 'psycopg2'
```

**원인**: 새 Docker 이미지를 빌드하지 않음

**해결**:
```bash
docker-compose down
docker-compose up -d --build
```

### 3. 진행률이 0%에서 멈춤
**원인**: Python이 DB를 업데이트하지 못함 (연결 실패)

**해결**: Python 로그 확인
```bash
docker logs naver-crawler-web | grep -i "db"
```

---

## 📝 TODO (향후 개선 사항)

- [ ] Favorites JSON → DB 마이그레이션
- [ ] JSON 파일 완전 제거 (DB만 사용)
- [ ] Redis 캐싱 추가 (성능 최적화)
- [ ] WebSocket으로 실시간 푸시 (폴링 제거)

---

**작성자**: Claude Code
**문의**: 이슈 등록 또는 팀원에게 문의
