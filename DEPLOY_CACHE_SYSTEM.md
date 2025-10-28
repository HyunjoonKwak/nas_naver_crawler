# 실거래가 캐싱 시스템 배포 가이드

## 📋 배포 개요

이 가이드는 실거래가 지역 단위 캐싱 시스템을 NAS에 안전하게 배포하는 절차를 안내합니다.

**주요 변경사항:**
- 데이터베이스 스키마 변경 (RealPriceCache 테이블 간소화)
- 캐싱 레이어 추가 (lib/real-price-cache.ts)
- API 라우트 캐싱 적용 (/api/real-price/search, /api/real-price/complex)

**예상 소요 시간:** 5분
**예상 다운타임:** 3초 (Docker 재시작)

---

## 🚀 배포 절차

### 1단계: NAS 접속

```bash
ssh luckyguy@luckyguy.synology.me -p 72
cd /volume1/docker/naver-crawler
```

### 2단계: 최신 코드 가져오기

```bash
git pull origin main
```

**예상 출력:**
```
remote: Enumerating objects: ...
Receiving objects: 100% (XX/XX), done.
From github.com:HyunjoonKwak/nas_naver_crawler
   ac48e43..02fc2b8  main -> main
Updating ac48e43..02fc2b8
Fast-forward
 lib/real-price-cache.ts                            | 207 ++++++++++++++++++++
 app/api/real-price/search/route.ts                |  20 +-
 app/api/real-price/complex/route.ts               |  26 ++-
 prisma/schema.prisma                               |   8 +-
 prisma/migrations/.../migration.sql                |  19 ++
 5 files changed, 263 insertions(+), 20 deletions(-)
```

### 3단계: 데이터베이스 마이그레이션 적용

**⚠️ 중요:** 이 단계에서 기존 RealPriceCache 데이터가 삭제됩니다 (캐시이므로 안전).

```bash
docker-compose exec web npx prisma migrate deploy
```

**예상 출력:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "naver_crawler"

1 migration found in prisma/migrations

Applying migration `20251028094651_simplify_real_price_cache_region_based`

The following migration(s) have been applied:

migrations/
  └─ 20251028094651_simplify_real_price_cache_region_based/
    └─ migration.sql

Your database is now in sync with your schema.
```

**오류 발생 시:**
```bash
# 마이그레이션 상태 확인
docker-compose exec web npx prisma migrate status

# 문제 해결: DB 직접 접속
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler

# 테이블 확인
\d real_price_cache

# 수동 마이그레이션 (필요 시)
# migration.sql 내용을 복사해서 실행
```

### 4단계: Prisma 클라이언트 재생성

```bash
docker-compose exec web npx prisma generate
```

**예상 출력:**
```
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client
```

### 5단계: 애플리케이션 재시작

```bash
docker-compose restart web
```

**예상 출력:**
```
Restarting naver-crawler-web ... done
```

**재시작 확인:**
```bash
docker-compose ps web
```

**정상 출력:**
```
       Name                      Command               State           Ports
--------------------------------------------------------------------------------
naver-crawler-web   docker-entrypoint.sh npm ...   Up      0.0.0.0:3000->3000/tcp
```

### 6단계: 로그 모니터링

```bash
docker-compose logs -f web | grep -E "(Real Price Cache|Error|Warning)"
```

**정상 동작 시 예상 로그:**
```
naver-crawler-web | [Real Price Cache] MISS: 11650-202501
naver-crawler-web | [Real Price Cache] SET: 11650-202501 (87 items, TTL: 30 days)
naver-crawler-web | [Real Price Cache] HIT: 11650-202501 (87 items, cached 2 minutes ago)
```

**Ctrl+C로 종료**

---

## ✅ 배포 확인

### 1. 웹 인터페이스 접속

```
http://[NAS-IP]:3000/real-price
```

### 2. 실거래가 검색 테스트

1. 지역 선택 (예: 서울시 → 서초구 → 서초동)
2. 기간 선택 (예: 3개월)
3. 검색 버튼 클릭

**첫 번째 검색 (캐시 미스):**
- 로딩 시간: 약 3초
- 로그: `[Real Price Cache] MISS: 11650-202501`
- 로그: `[Real Price Cache] SET: 11650-202501 (XX items)`

**두 번째 검색 (캐시 히트):**
- 로딩 시간: 약 0.05초 (60배 빠름!)
- 로그: `[Real Price Cache] HIT: 11650-202501 (XX items, cached X minutes ago)`

### 3. 단지별 실거래가 테스트

1. 매물관리 → 단지 상세보기
2. 실거래가 분석 탭 클릭

**예상 로그 (3개월 조회):**
```
[Real Price Cache] MISS: 11650-202501
[Real Price Cache] SET: 11650-202501 (87 items)
[Real Price Cache] HIT: 11650-202412 (92 items)  ← 이미 캐시됨!
[Real Price Cache] MISS: 202411
```

### 4. 캐시 통계 확인 (선택)

Docker 컨테이너 내부에서:

```bash
docker-compose exec web node -e "
const { getRealPriceCacheStats } = require('./lib/real-price-cache.ts');
getRealPriceCacheStats().then(console.log);
"
```

**예상 출력:**
```json
{
  "totalEntries": 5,
  "totalItems": 437,
  "oldestCache": "2025-10-28T09:50:00.000Z",
  "newestCache": "2025-10-28T10:15:00.000Z",
  "expiredCount": 0
}
```

---

## 🐛 문제 해결

### 문제 1: 마이그레이션 실패

**증상:**
```
Error: P3005: The database schema is not empty.
```

**원인:** 기존 마이그레이션 상태 불일치

**해결:**
```bash
# 1. 마이그레이션 히스토리 확인
docker-compose exec web npx prisma migrate status

# 2. 수동 마이그레이션 적용
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler \
  -f prisma/migrations/20251028094651_simplify_real_price_cache_region_based/migration.sql

# 3. 마이그레이션 기록 업데이트
docker-compose exec web npx prisma migrate resolve --applied 20251028094651_simplify_real_price_cache_region_based
```

### 문제 2: Prisma 클라이언트 오류

**증상:**
```
Error: @prisma/client did not initialize yet.
```

**해결:**
```bash
# Prisma 클라이언트 재생성
docker-compose exec web npx prisma generate

# 앱 재시작
docker-compose restart web
```

### 문제 3: 캐시 저장 실패

**증상 (로그):**
```
[Real Price Cache] Write error: P2002: Unique constraint failed
```

**원인:** 데이터베이스 스키마 불일치

**해결:**
```bash
# 캐시 테이블 재생성
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler

DROP TABLE IF EXISTS real_price_cache CASCADE;

# 마이그레이션 재적용
docker-compose exec web npx prisma migrate deploy
docker-compose restart web
```

### 문제 4: 로그인 불가 / 세션 오류

**증상:** 로그인 후 바로 로그아웃됨

**원인:** 이전 캐싱 시도 때와 동일한 문제 발생 가능성

**해결:**
```bash
# 1. Prisma 연결 확인
docker-compose exec web node -e "
const { prisma } = require('./lib/prisma');
prisma.\$connect().then(() => console.log('OK')).catch(console.error);
"

# 2. 세션 테이블 확인
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler -c "\d users"

# 3. 전체 재시작
docker-compose restart
```

### 문제 5: 기존 기능 동작 안 함

**긴급 롤백 절차:**

```bash
# 1. 코드 롤백
git revert HEAD~2..HEAD  # 마이그레이션 + 캐싱 코드 커밋 되돌리기
git push origin main

# 2. NAS에서 적용
cd /volume1/docker/naver-crawler
git pull origin main

# 3. 데이터베이스 롤백 (수동)
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler

-- 캐시 테이블 삭제
DROP TABLE IF EXISTS real_price_cache CASCADE;

-- 이전 버전 테이블 재생성 (필요 시)
-- prisma/migrations/20251027000000_add_real_price_cache/migration.sql 참고

# 4. 재시작
docker-compose restart web

# 5. 동작 확인
docker-compose logs -f web
```

---

## 📊 성능 모니터링

### 캐시 히트율 확인

```bash
# 최근 1000줄 로그에서 캐시 히트/미스 통계
docker-compose logs --tail=1000 web | grep "Real Price Cache" | \
  awk '{print $NF}' | sort | uniq -c
```

**예상 출력:**
```
  15 MISS:
  85 HIT:
  15 SET:
```
→ 캐시 히트율: 85% (85 / (85+15))

### API 호출 감소 확인

```bash
# 공공 API 호출 로그
docker-compose logs --tail=1000 web | grep -c "RTMSDataSvcAptTradeDev"
```

**Before:** 매 검색마다 API 호출
**After:** 캐시 히트 시 API 호출 없음

---

## 🎯 배포 성공 기준

- ✅ 마이그레이션 적용 완료
- ✅ 웹 애플리케이션 정상 접속
- ✅ 로그인 정상 동작
- ✅ 실거래가 검색 정상 동작
- ✅ 캐시 로그 정상 출력 (HIT/MISS/SET)
- ✅ 캐시 히트 시 응답 속도 개선 확인 (3초 → 0.05초)

---

## 📝 배포 후 작업

### 1. 캐시 워밍 (선택)

주요 지역 데이터를 미리 캐싱하여 사용자 경험 개선:

```bash
# 자주 조회되는 지역 목록
# 서초동(11650), 강남구(11680), 송파구(11710) 등

curl "http://localhost:3000/api/real-price/search?lawdCd=11650&dealYmd=202501"
curl "http://localhost:3000/api/real-price/search?lawdCd=11650&dealYmd=202412"
curl "http://localhost:3000/api/real-price/search?lawdCd=11680&dealYmd=202501"
```

### 2. 만료 캐시 정리 크론 설정 (향후)

`lib/real-price-cache.ts`의 `cleanExpiredRealPriceCache()` 함수를 크론에 등록:

```typescript
// lib/scheduler.ts에 추가 예정
cron.schedule('0 3 * * *', async () => {
  // 매일 새벽 3시 만료 캐시 정리
  const count = await cleanExpiredRealPriceCache();
  console.log(`Cleaned ${count} expired real-price caches`);
});
```

### 3. 모니터링 대시보드 추가 (향후)

캐시 통계를 관리자 페이지에 표시:

```typescript
// app/admin/cache-stats/page.tsx
const stats = await getRealPriceCacheStats();
// totalEntries, totalItems, hitRate 등 표시
```

---

## 🔄 다음 개선 사항 (Phase 2)

1. **아파트명 필터링 캐싱**
   - 현재: aptName 파라미터 있을 때는 캐시 미사용
   - 개선: 캐시에서 가져와서 메모리 필터링

2. **Redis 캐싱**
   - 현재: PostgreSQL 캐싱 (30일 TTL)
   - 개선: Redis L1 캐시 추가 (1시간 TTL, 더 빠름)

3. **캐시 무효화 API**
   - 관리자가 수동으로 특정 지역 캐시 갱신

4. **캐시 프리로딩**
   - 자주 조회되는 지역 자동 캐싱

---

## 📞 문제 발생 시

1. **로그 확인**: `docker-compose logs -f web`
2. **데이터베이스 확인**: `docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler`
3. **긴급 롤백**: 위 "문제 5" 참고
4. **질문**: GitHub Issues에 로그와 함께 등록

---

**배포 성공을 기원합니다! 🚀**
