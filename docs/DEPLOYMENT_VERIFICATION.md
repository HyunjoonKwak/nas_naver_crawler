# 🔍 배포 검증 자동화 가이드

**버전**: v2.11.0+
**작성일**: 2025-11-01

---

## 📋 개요

배포 후 **수동으로 확인해야 하는 항목들을 자동화**하여, 배포 실패를 즉시 감지하고 안정성을 보장합니다.

---

## 🎯 자동 검증 항목 (5단계)

### 1️⃣ 컨테이너 시작 대기
**목적**: 컨테이너가 완전히 시작될 때까지 대기

```bash
sleep 5
```

**의미**:
- Docker 컨테이너는 `docker-compose up -d` 실행 직후에는 아직 초기화 중
- Next.js 앱이 포트 3000에서 listen 시작하기까지 3~5초 소요
- 너무 빨리 검증하면 false negative (정상인데 실패로 판정)

---

### 2️⃣ 컨테이너 상태 확인
**목적**: 웹 컨테이너가 "Up" 상태인지 확인

```bash
docker-compose ps web | grep -i "up"
```

**의미**:
- 컨테이너가 시작되었지만 즉시 종료되는 경우 감지
- Exit code 검증 (0이 아니면 실패)
- 일반적인 실패 원인:
  - 환경 변수 누락 (DATABASE_URL, REDIS_URL)
  - 포트 충돌 (3000 포트 이미 사용 중)
  - Next.js 빌드 실패 (프로덕션 모드)

**실패 시 동작**:
- 자동으로 로그 출력 (`docker-compose logs --tail=50 web`)
- 스크립트 종료 (exit 1)

---

### 3️⃣ NODE_ENV 환경 변수 확인
**목적**: 올바른 모드로 실행되는지 검증

```bash
docker-compose exec -T web env | grep NODE_ENV | cut -d'=' -f2
```

**의미**:
- **개발 모드**: `NODE_ENV=development` 기대
  - Hot Reload 활성화
  - 소스맵 포함
  - 디버깅 편리

- **프로덕션 모드**: `NODE_ENV=production` 기대
  - Next.js 최적화 빌드 적용
  - 압축, 캐싱 활성화
  - 메모리 사용량 감소

**불일치 시 문제**:
- 프로덕션 Dockerfile + 개발 NODE_ENV → 성능 미최적화
- 개발 Dockerfile + 프로덕션 NODE_ENV → Hot Reload 동작 안 함

**검증 결과**:
- ✅ 일치: 정상
- ⚠️ 불일치: 경고 (계속 진행하지만 사용자에게 알림)

---

### 4️⃣ 데이터베이스 연결 확인
**목적**: PostgreSQL 컨테이너 정상 실행 확인

```bash
docker-compose ps db | grep -i "up"
```

**의미**:
- 웹 앱은 DB 연결 없이도 시작할 수 있음 (초기화 실패하지 않음)
- 하지만 API 호출 시 에러 발생:
  ```
  Error: Connection refused at db:5432
  ```
- 크롤러 실행 시 데이터 저장 불가

**DB 컨테이너 실패 원인**:
- 포트 충돌 (5434 포트 사용 중)
- 볼륨 권한 문제
- 메모리 부족

**검증 결과**:
- ✅ 정상: DB 컨테이너 Up
- ⚠️ 경고: DB 컨테이너 Down (웹은 시작되지만 기능 제한)

---

### 5️⃣ Redis 연결 확인
**목적**: Redis 캐시 서버 정상 실행 확인

```bash
docker-compose ps redis | grep -i "up"
```

**의미**:
- 앱은 Redis 없이도 동작 (graceful degradation)
- Redis 실패 시 영향:
  - 캐시 무효화 → 모든 요청이 DB 직접 조회
  - 성능 저하 (응답 시간 3~5배 증가)
  - 스케줄러 중복 실행 방지 실패 가능

**Redis 컨테이너 실패 원인**:
- 포트 충돌 (6379 포트 사용 중)
- 메모리 부족
- 볼륨 권한 문제

**검증 결과**:
- ✅ 정상: Redis 컨테이너 Up
- ⚠️ 경고: Redis 컨테이너 Down (성능 저하 예상)

---

## 🚀 자동화 적용 위치

### 1. deploy-to-nas.sh

**위치**: [deploy-to-nas.sh:158-225](../deploy-to-nas.sh#L158-L225)

**실행 시점**: `./deploy-to-nas.sh dev` 또는 `./deploy-to-nas.sh prod` 마지막 단계

**예상 출력**:
```bash
ℹ️  Step 4: 배포 검증 중...

ℹ️  검증 1/5: 컨테이너 시작 대기 중...
ℹ️  검증 2/5: 컨테이너 상태 확인 중...
✅ 웹 컨테이너 정상 실행 중
ℹ️  검증 3/5: NODE_ENV 확인 중...
✅ NODE_ENV=production (프로덕션 모드)
ℹ️  검증 4/5: 데이터베이스 연결 확인 중...
✅ 데이터베이스 컨테이너 정상 실행 중
ℹ️  검증 5/5: Redis 연결 확인 중...
✅ Redis 컨테이너 정상 실행 중

🎉 모든 검증 통과!
```

---

### 2. switch-mode-safe.sh

**위치**: [scripts/switch-mode-safe.sh:202-263](../scripts/switch-mode-safe.sh#L202-L263)

**실행 시점**: `./scripts/switch-mode-safe.sh` 모드 전환 후

**예상 출력**:
```bash
4️⃣  배포 검증 중...

[INFO] 검증 1/5: 컨테이너 시작 대기 중...
[INFO] 검증 2/5: 컨테이너 상태 확인 중...
[INFO] ✅ 웹 컨테이너 정상 실행 중
[INFO] 검증 3/5: NODE_ENV 확인 중...
[INFO] ✅ NODE_ENV=development (개발 모드)
[INFO] 검증 4/5: 데이터베이스 연결 확인 중...
[INFO] ✅ 데이터베이스 컨테이너 정상 실행 중
[INFO] 검증 5/5: Redis 연결 확인 중...
[INFO] ✅ Redis 컨테이너 정상 실행 중

[INFO] 🎉 모든 검증 통과!
```

---

## ⚠️ 검증 실패 시 동작

### 컨테이너 시작 실패 (검증 2/5)

**증상**:
```bash
❌ 웹 컨테이너가 실행되지 않았습니다

로그 확인:
web_1  | Error: Cannot find module '/app/.next'
web_1  | Exited with code 1
```

**자동 조치**:
- 최근 50줄 로그 자동 출력
- 스크립트 즉시 종료 (exit 1)
- 사용자가 수동 수정 필요

**해결 방법**:
```bash
# 프로덕션 빌드 실패 시
docker-compose -f docker-compose.prod.yml build --no-cache

# 환경 변수 확인
cat config.env | grep -E "DATABASE_URL|REDIS_URL|NODE_ENV"

# 재배포
./deploy-to-nas.sh prod
```

---

### NODE_ENV 불일치 (검증 3/5)

**증상**:
```bash
⚠️  NODE_ENV=development (예상: production)
```

**의미**: 프로덕션 모드로 배포했지만 개발 환경 변수 사용 중

**영향**:
- 성능 최적화 미적용
- 메모리 사용량 증가
- Hot Reload 활성화 (불필요)

**해결 방법**:
```bash
# docker-compose.prod.yml 확인
grep NODE_ENV docker-compose.prod.yml
# 출력: - NODE_ENV=production

# 컨테이너 재시작
docker-compose -f docker-compose.prod.yml restart web
```

---

### DB/Redis 컨테이너 Down (검증 4/5, 5/5)

**증상**:
```bash
⚠️  데이터베이스 컨테이너가 실행되지 않았습니다
⚠️  Redis 컨테이너가 실행되지 않았습니다
```

**의미**: 웹 앱은 시작되지만 기능 제한됨

**영향**:
- DB Down: API 요청 실패, 크롤러 동작 불가
- Redis Down: 캐시 무효화, 성능 저하

**해결 방법**:
```bash
# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs db
docker-compose logs redis

# 재시작
docker-compose restart db redis

# 완전 재시작 (볼륨 유지)
docker-compose down
docker-compose up -d
```

---

## 📊 검증 흐름도

```
배포 스크립트 실행
     ↓
컨테이너 시작 (up -d)
     ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   자동 검증 시작 (5단계)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ↓
1️⃣  5초 대기 (초기화 시간)
     ↓
2️⃣  컨테이너 상태 확인
     ├─ ✅ Up → 계속
     └─ ❌ Down → 로그 출력 + 종료
     ↓
3️⃣  NODE_ENV 확인
     ├─ ✅ 일치 → 계속
     └─ ⚠️ 불일치 → 경고 + 계속
     ↓
4️⃣  DB 컨테이너 확인
     ├─ ✅ Up → 계속
     └─ ⚠️ Down → 경고 + 계속
     ↓
5️⃣  Redis 컨테이너 확인
     ├─ ✅ Up → 계속
     └─ ⚠️ Down → 경고 + 계속
     ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎉 모든 검증 통과!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ↓
배포 완료 메시지 출력
```

---

## 💡 왜 자동화가 필요한가?

### ❌ 수동 검증의 문제점

**놓치기 쉬운 항목들**:
```bash
# 사용자가 매번 실행해야 하는 명령어들
docker-compose ps                                      # 1. 컨테이너 상태
docker-compose exec web env | grep NODE_ENV           # 2. 환경 변수
docker-compose logs --tail=50 web                      # 3. 로그 확인
curl http://localhost:3000/api/health                  # 4. 헬스체크
```

**문제**:
- 귀찮아서 생략 → 배포 실패를 늦게 발견
- 명령어 오타 가능
- 환경별 명령어 차이 (dev vs prod compose 파일)

---

### ✅ 자동 검증의 장점

1. **일관성**: 항상 동일한 검증 절차 실행
2. **신속성**: 배포 직후 즉시 결과 확인 (5초 내)
3. **안전성**: 실패 시 자동 종료 (잘못된 배포 방지)
4. **가시성**: 검증 진행 상황 실시간 표시 (1/5 → 5/5)
5. **자동 복구**: 로그 자동 출력으로 빠른 문제 파악

---

## 🎯 실전 예제

### 시나리오 1: 정상 배포

```bash
$ ./deploy-to-nas.sh prod

ℹ️  Step 3: 프로덕션 환경 배포 시작...
✅ 컨테이너 시작 완료

ℹ️  Step 4: 배포 검증 중...

ℹ️  검증 1/5: 컨테이너 시작 대기 중...
ℹ️  검증 2/5: 컨테이너 상태 확인 중...
✅ 웹 컨테이너 정상 실행 중
ℹ️  검증 3/5: NODE_ENV 확인 중...
✅ NODE_ENV=production (프로덕션 모드)
ℹ️  검증 4/5: 데이터베이스 연결 확인 중...
✅ 데이터베이스 컨테이너 정상 실행 중
ℹ️  검증 5/5: Redis 연결 확인 중...
✅ Redis 컨테이너 정상 실행 중

🎉 모든 검증 통과!

======================================================================
  🎉 배포 완료!
======================================================================
```

**결과**: 안심하고 사용 가능!

---

### 시나리오 2: 빌드 실패 감지

```bash
$ ./deploy-to-nas.sh prod

ℹ️  Step 3: 프로덕션 이미지 빌드 중...
[빌드 에러 발생...]

ℹ️  Step 4: 배포 검증 중...

ℹ️  검증 1/5: 컨테이너 시작 대기 중...
ℹ️  검증 2/5: 컨테이너 상태 확인 중...
❌ 웹 컨테이너가 실행되지 않았습니다

로그 확인:
web_1  | Error: Cannot find module '@/lib/prisma'
web_1  | at Module._resolveFilename (node:internal/modules/cjs/loader:1048:15)
web_1  | Exited with code 1
```

**자동 조치**: 스크립트 종료 (exit 1)
**사용자 조치**:
```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 재배포
./deploy-to-nas.sh prod
```

---

### 시나리오 3: NODE_ENV 불일치 감지

```bash
$ ./deploy-to-nas.sh prod

✅ 컨테이너 시작 완료

ℹ️  Step 4: 배포 검증 중...

ℹ️  검증 3/5: NODE_ENV 확인 중...
⚠️  NODE_ENV=development (예상: production)

✅ 데이터베이스 컨테이너 정상 실행 중
✅ Redis 컨테이너 정상 실행 중

🎉 모든 검증 통과!
```

**경고 의미**: 컨테이너는 실행되지만 최적화 미적용
**사용자 판단**: 성능 이슈 발생 시 재배포 필요

---

## 📚 관련 문서

- **[PRODUCTION_MODE_GUIDE.md](../PRODUCTION_MODE_GUIDE.md)** - 프로덕션 모드 사용 가이드
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - 프로덕션 배포 상세 가이드
- **[MODE_SWITCHING_ANALYSIS.md](../MODE_SWITCHING_ANALYSIS.md)** - 모드 전환 안전성 분석

---

**Made with ❤️ for NAS users**
