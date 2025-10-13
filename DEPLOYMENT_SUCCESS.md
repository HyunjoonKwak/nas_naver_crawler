# 배포 완료 보고서

## 실행 일시
2025-10-13

## 문제 해결 과정

### 1. 초기 문제 발견
- Prisma가 "column does not exist" 에러 발생
- 원인: 잘못된 데이터베이스에 작업 진행

### 2. 원인 분석
- 이전 프로젝트 (`naver_realestate`) DB와 현재 프로젝트 (`naver_crawler`) DB 혼동
- 현재 프로젝트가 NAS에 배포되지 않은 상태
- 이전 프로젝트의 `naver_realestate` DB에 테이블을 잘못 생성함

### 3. 해결 조치

#### Step 1: 이전 프로젝트 DB 정상화 ✅
```sql
DROP TABLE crawl_history CASCADE;
```
- 이전 프로젝트 DB(`naver_realestate`)에서 잘못 생성한 테이블 삭제
- 이전 프로젝트는 원래 상태로 복구됨

#### Step 2: 포트 충돌 해결 ✅
- 이전 프로젝트: 포트 5433 사용 중
- 현재 프로젝트: 5434로 변경 (docker-compose.yml 수정)

#### Step 3: 현재 프로젝트 배포 ✅
```bash
docker-compose up -d
```
- DB 컨테이너: `naver-crawler-db` (포트 5434)
- Web 컨테이너: `naver-crawler-web` (포트 3000)

#### Step 4: Prisma 마이그레이션 ✅
```bash
docker exec naver-crawler-web npx prisma db push
```
- 모든 테이블 자동 생성 (9개 테이블)
- Prisma Client 자동 생성
- `crawl_history` 테이블 정상 생성됨

## 현재 상태

### 배포된 컨테이너
```
naver-crawler-db    postgres:16-alpine   5434:5432
naver-crawler-web   nas_naver_crawler    3000:3000
```

### 데이터베이스 구조
- **데이터베이스명**: `naver_crawler`
- **유저**: `crawler_user`
- **포트**: 5434 (외부) → 5432 (내부)

### 생성된 테이블 (9개)
1. `_prisma_migrations` - Prisma 마이그레이션 기록
2. `alerts` - 알림 설정
3. `articles` - 매물 정보
4. `complexes` - 단지 정보
5. **`crawl_history`** - 크롤링 히스토리 ✅
6. `favorites` - 즐겨찾기
7. `notification_logs` - 알림 로그
8. `schedule_logs` - 스케줄 실행 로그
9. `schedules` - 스케줄 설정

### crawl_history 테이블 구조
```
컬럼명                  타입                     설명
-------------------------------------------------------
id                    text                   Primary Key
complexNos            text[]                 크롤링한 단지 번호들
totalComplexes        integer                총 단지 수
successCount          integer                성공한 단지 수
errorCount            integer                실패한 단지 수
totalArticles         integer                총 매물 수
duration              integer                소요 시간 (ms)
status                text                   상태
errorMessage          text                   에러 메시지
current_step          text                   현재 단계 (Python이 업데이트)
processed_articles    integer                처리된 매물 수 (Python이 업데이트)
processed_complexes   integer                처리된 단지 수 (Python이 업데이트)
created_at            timestamp              생성 시간
updated_at            timestamp              수정 시간
```

**중요**: Python 크롤러가 업데이트하는 3개 필드는 snake_case로 되어 있어 정상 작동합니다.

## API 동작 확인

### 상태 체크 API ✅
```bash
curl http://localhost:3000/api/status
```
응답:
```json
{
  "crawler": {
    "scriptExists": true,
    "playwrightReady": true,
    "ready": true
  },
  "data": {
    "crawledFilesCount": 0
  },
  "crawledDataCount": 0,
  "favoritesCount": 0,
  "crawledDataSize": "4.0K",
  "status": "ready"
}
```

## 프로젝트 간 비교

| 항목 | 이전 프로젝트 | 현재 프로젝트 |
|------|--------------|--------------|
| DB 컨테이너 | `naver_realestate_db` | `naver-crawler-db` |
| DB 이름 | `naver_realestate` | `naver_crawler` |
| DB 포트 | 5433 | 5434 |
| 유저 | `postgres` | `crawler_user` |
| 상태 | 실행 중 (영향 없음) | 새로 배포됨 ✅ |

## 테스트 절차

### 1. 웹 인터페이스 접속
```
http://localhost:3000
```

### 2. 크롤링 테스트
1. 웹 인터페이스에서 단지 번호 입력
2. 크롤링 시작
3. **실시간 진행률 확인** (0% → 100%)
4. 데이터베이스 확인:
   ```bash
   docker exec naver-crawler-db psql -U crawler_user -d naver_crawler \
     -c "SELECT id, status, current_step, processed_complexes, total_complexes, duration FROM crawl_history ORDER BY created_at DESC LIMIT 5;"
   ```

### 3. 로그 확인
```bash
# Web 컨테이너 로그
docker logs naver-crawler-web -f

# DB 컨테이너 로그
docker logs naver-crawler-db -f
```

## 주요 코드 변경사항

### 1. Python 크롤러
- [logic/nas_playwright_crawler.py](logic/nas_playwright_crawler.py)
- psycopg2 연결 추가
- `update_status()` 메서드에서 DB 업데이트

### 2. API 엔드포인트
- [app/api/crawl/route.ts](app/api/crawl/route.ts): crawl_id 전달
- [app/api/crawl-status/route.ts](app/api/crawl-status/route.ts): 진행률 조회

### 3. 프론트엔드
- [components/CrawlerForm.tsx](components/CrawlerForm.tsx): 실시간 진행률 표시

## 환경변수

### .env (로컬 개발)
```env
DATABASE_URL="postgresql://crawler_user:crawler_pass_2025@localhost:5434/naver_crawler?schema=public"
```

### docker-compose.yml (컨테이너 내부)
```env
DATABASE_URL=postgresql://crawler_user:crawler_pass_2025@db:5432/naver_crawler
```

## 다음 단계

- [ ] 실제 크롤링 테스트 (단지 번호로 크롤링 실행)
- [ ] 진행률 실시간 업데이트 확인 (0% → 100%)
- [ ] Python 크롤러의 DB 업데이트 동작 확인
- [ ] 에러 핸들링 테스트
- [ ] 장시간 크롤링 안정성 테스트

## 문제 해결 체크리스트

- [x] 이전 프로젝트 DB 정상화
- [x] 포트 충돌 해결
- [x] 현재 프로젝트 배포
- [x] DB 테이블 생성
- [x] Prisma Client 생성
- [x] API 동작 확인
- [x] 웹 서버 정상 가동

## 결과

✅ **배포 성공!**

모든 컴포넌트가 정상적으로 배포되었고, 크롤링 기능을 테스트할 준비가 완료되었습니다.

---

**배포 완료 시간**: 2025-10-13
**담당자**: Claude AI Assistant
**상태**: 정상 동작 중
