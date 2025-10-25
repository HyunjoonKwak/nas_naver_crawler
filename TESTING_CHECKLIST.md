# 🧪 perf_improve 브랜치 테스트 체크리스트

## 📌 **1. 성능 개선 기능**

### ✅ SSE 연결 관리
- [ ] 프로덕션: SSE 연결이 30분 이상 유지되는지 확인
- [ ] 테스트(perf_improve): SSE 연결이 10분 이내에 종료되는지 확인
- [ ] Heartbeat 로그 확인: `docker logs naver-crawler-web-test 2>&1 | grep Heartbeat`
- [ ] 예상: 최대 600초 (10분) 이내

```bash
# 테스트 명령어
docker logs naver-crawler-web-test 2>&1 | grep -E "SSE.*connection alive" | tail -20
docker logs naver-crawler-web 2>&1 | grep -E "SSE.*connection alive" | tail -20
```

### ✅ 중복 크롤링 방지
- [ ] 크롤링 시작
- [ ] 즉시 같은 단지로 다시 크롤링 시도
- [ ] "이미 크롤링이 진행 중입니다" 409 에러 확인
- [ ] 로그: `docker logs naver-crawler-web-test 2>&1 | grep "already in progress"`

### ✅ 알림 쿼리 최적화 (N+1 제거)
- [ ] 여러 단지 크롤링 후 알림 발생
- [ ] 로그에서 DB 쿼리 개수 확인
- [ ] 이전: N×2 쿼리 → 개선: 1 쿼리

---

## 📌 **2. Redis 캐싱**

### ✅ Redis 동작 확인
```bash
# Redis stats 확인
docker exec naver-crawler-redis-test redis-cli INFO stats

# 캐시 히트율
docker exec naver-crawler-redis-test redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# 현재 저장된 키
docker exec naver-crawler-redis-test redis-cli KEYS "*"
```

- [ ] 캐시 히트율 > 50%
- [ ] 크롤링 결과가 캐시에 저장되는지 확인
- [ ] TTL 설정 확인 (1시간)

---

## 📌 **3. 데이터베이스 인덱스 최적화**

### ✅ 인덱스 적용 확인
```bash
# PostgreSQL 접속
docker exec -it naver-crawler-db-test psql -U crawler_user -d naver_crawler_test

# 인덱스 확인
\di

# 예상 인덱스:
# - idx_articles_complex_trade
# - idx_articles_crawl
# - idx_crawl_history_created
```

### ✅ 쿼리 성능 측정
```sql
-- 쿼리 실행 계획 확인
EXPLAIN ANALYZE
SELECT * FROM "Article"
WHERE "complexId" = 1 AND "tradeType" = 'A1'
ORDER BY "floorInfo" DESC
LIMIT 20;

-- Seq Scan이 아닌 Index Scan 사용하는지 확인
```

---

## 📌 **4. TypeScript 빌드**

### ✅ 프로덕션 빌드
```bash
# 환경 변수 설정
export SKIP_ENV_VALIDATION=true
export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# 빌드
npm run build

# 결과: 에러 없이 완료
```

- [ ] TypeScript 컴파일 에러 0개
- [ ] ESLint 에러 → 워닝으로 변경됨
- [ ] 빌드 성공

---

## 📌 **5. Docker 환경**

### ✅ 프로덕션 모드 (Dockerfile)
```bash
# 빌드
docker build -t test-prod -f Dockerfile .

# 실행
docker run -e DATABASE_URL=postgresql://test test-prod
```

- [ ] 빌드 성공
- [ ] 이미지 크기 < 2GB
- [ ] 실행 시 즉시 시작 (2-3초)

### ✅ 개발 모드 (Dockerfile.dev)
```bash
# 빌드
docker build -t test-dev -f Dockerfile.dev .

# Hot Reload 테스트
# - 파일 수정
# - 자동 재시작 확인
```

---

## 📌 **6. 보안 & 환경 설정**

### ✅ 환경 변수 검증
```bash
# lib/env.ts 검증 로직
node -e "require('./lib/env').validateEnv()"
```

- [ ] 필수 환경 변수 누락 시 에러
- [ ] SKIP_ENV_VALIDATION=true 시 검증 우회
- [ ] 개발 환경에서는 경고만

### ✅ API 에러 핸들링
```bash
# API 테스트
curl http://localhost:3001/api/health

# 인증 필요 API
curl http://localhost:3001/api/complexes
# → 401 Unauthorized
```

---

## 📌 **7. 세션 관리**

### ✅ 독립적인 세션 관리
- [ ] 3000포트 로그인 → 3001포트 로그아웃 안됨
- [ ] 3001포트 로그인 → 3000포트 로그아웃 안됨
- [ ] 브라우저 쿠키:
  - 쿠키 이름: 동일 (`next-auth.session-token`)
  - NEXTAUTH_SECRET: 서로 다름 (JWT 암호화 키)
  - 같은 이름이지만 다른 시크릿으로 암호화되어 충돌 없음

### ✅ 환경 변수 확인
```bash
# 프로덕션 시크릿
docker exec naver-crawler-web printenv | grep NEXTAUTH_SECRET

# 테스트 시크릿 (달라야 함!)
docker exec naver-crawler-web-test printenv | grep NEXTAUTH_SECRET
```

**중요**: 쿠키 커스터마이징(`.test` 접미사)은 제거됨. 대신 NEXTAUTH_SECRET 분리로 세션 격리.

---

## 📌 **8. 문서 & 가이드**

### ✅ 추가된 문서 확인
```bash
ls -la *.md
```

- [ ] `DEPLOYMENT_GUIDE.md` - 배포 가이드
- [ ] `PERFORMANCE_FIX.md` - 성능 개선 내용
- [ ] `PERFORMANCE_SUMMARY.md` - 성능 요약
- [ ] `DEV_ENVIRONMENT_SETUP.md` - 개발 환경 설정
- [ ] `env.template` - 환경 변수 템플릿

---

## 📌 **9. manage.sh 스크립트**

### ✅ 환경 전환 기능
```bash
./manage.sh
# → 8) 환경 전환 선택
```

- [ ] 프로덕션 → 테스트 전환
- [ ] 테스트 → 프로덕션 전환
- [ ] 환경 자동 감지

### ✅ 모드 전환 기능
```bash
./manage.sh
# → 7) 모드 전환 선택
```

- [ ] 개발 모드 ↔ 프로덕션 모드
- [ ] docker-compose.yml / docker-compose.test.yml 자동 선택

---

## 📌 **10. 메모리 & 리소스**

### ✅ 메모리 사용량
```bash
# 30초간 모니터링
docker stats --no-stream naver-crawler-web-test naver-crawler-web
```

**예상:**
- 웹 컨테이너: < 500MB
- DB 컨테이너: < 100MB
- Redis: < 50MB

### ✅ SSE 메모리 누수 방지
- [ ] 장시간 실행 후 메모리 증가 없음
- [ ] SSE 연결 자동 정리됨

---

## 📊 **전체 통과 기준**

### 필수 (Must Pass)
- [x] TypeScript 빌드 성공
- [x] 크롤링 정상 동작 (65초 내외)
- [x] SSE 연결 10분 이내 정리
- [x] 중복 크롤링 방지
- [x] 독립적인 세션

### 권장 (Should Pass)
- [ ] Redis 캐시 히트율 > 50%
- [ ] DB 인덱스 사용 확인
- [ ] 메모리 안정적 (누수 없음)
- [ ] CI/CD 파이프라인 통과

### 선택 (Nice to Have)
- [ ] 테스트 커버리지 > 70%
- [ ] Python 린트 통과
- [ ] 문서 완성도

---

## 🚀 **최종 승인 체크리스트**

merge to main 전 확인:

- [ ] 모든 필수 테스트 통과
- [ ] NAS 테스트 환경에서 24시간 이상 안정적 동작
- [ ] 프로덕션 환경과 성능 동일 또는 개선
- [ ] 문서 업데이트 완료
- [ ] 코드 리뷰 완료 (self-review)

**승인자:** ___________
**날짜:** ___________
