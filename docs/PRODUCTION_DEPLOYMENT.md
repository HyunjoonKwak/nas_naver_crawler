# 🚀 프로덕션 배포 가이드

**대상**: NAS에서 최적화된 프로덕션 모드로 배포하려는 사용자

---

## 📋 목차

1. [개발 모드 vs 프로덕션 모드](#개발-모드-vs-프로덕션-모드)
2. [프로덕션 배포 방법](#프로덕션-배포-방법)
3. [배포 후 검증](#배포-후-검증)
4. [프로덕션 → 개발 모드 전환](#프로덕션-→-개발-모드-전환)
5. [문제 해결](#문제-해결)

---

## 개발 모드 vs 프로덕션 모드

### 개발 모드 (기본값)

**사용 파일:**
- `docker-compose.yml` / `docker-compose.dev.yml`
- `Dockerfile` / `Dockerfile.dev`

**특징:**
```yaml
✅ Hot Reload 활성화 (코드 변경 즉시 반영)
✅ 빠른 재시작 (3~5초)
✅ 소스 코드 볼륨 마운트
✅ 디버깅 편리
⚠️ 메모리 사용량 높음 (Hot Reload 오버헤드)
⚠️ Next.js 빌드 최적화 없음
⚠️ NODE_ENV=development
```

**적합한 경우:**
- 개인 NAS 사용
- 빠른 기능 추가/수정
- 개발 중인 환경

---

### 프로덕션 모드

**사용 파일:**
- `docker-compose.prod.yml`
- `Dockerfile.prod`

**특징:**
```yaml
✅ Next.js 최적화 빌드 (압축, 캐싱)
✅ 프로덕션 의존성만 설치
✅ Hot Reload 비활성화 (리소스 절약)
✅ 메모리 사용량 최적화
✅ NODE_ENV=production
⚠️ 빌드 시간 오래 걸림 (10~15분)
⚠️ 코드 변경 시 재빌드 필요
```

**적합한 경우:**
- 공용 NAS 환경
- 안정적인 운영 필요
- 성능 최적화 필요
- 여러 사용자 동시 접속

---

## 프로덕션 배포 방법

### 사전 준비

#### 1. 현재 환경 백업

```bash
# NAS SSH 접속
ssh admin@<NAS_IP>

# 프로젝트 디렉토리 이동
cd /volume1/docker/naver-crawler

# 현재 로그 백업
docker-compose logs --tail=500 web > backup-$(date +%Y%m%d-%H%M%S).log

# 데이터베이스 백업 (선택)
docker exec naver-crawler-db pg_dump -U crawler_user naver_crawler > db-backup-$(date +%Y%m%d).sql
```

#### 2. 최신 코드 가져오기

```bash
git pull origin main
```

---

### 방법 1: 배포 스크립트 사용 (권장) ⭐

```bash
./deploy-to-nas.sh prod
```

**예상 출력:**
```
======================================================================
  NAS 배포 스크립트 v2.11.0
  환경: prod
  시작 시간: 2025-11-01 12:00:00
======================================================================

ℹ️  Step 1: 사전 요구사항 체크 중...
✅ Docker 확인 완료
✅ Docker Compose 확인 완료
✅ config.env 파일 확인 완료

ℹ️  Step 2: Git 상태 확인 중...
ℹ️  현재 브랜치: main
ℹ️  커밋 해시: 381c997
✅ Git 상태 깨끗함

ℹ️  Step 3: 프로덕션 환경 배포 시작...
ℹ️  기존 컨테이너 중지 중...
✅ 컨테이너 중지 완료

ℹ️  프로덕션 이미지 빌드 중... (10~15분 소요)
ℹ️    - Next.js 최적화 빌드 (npm run build)
ℹ️    - 프로덕션 의존성만 설치
ℹ️    - Hot Reload 비활성화

[빌드 로그 출력...]

✅ 프로덕션 이미지 빌드 완료

ℹ️  컨테이너 시작 중...
✅ 컨테이너 시작 완료

✨ 프로덕션 모드로 배포 완료 (최적화됨)

ℹ️  Step 4: 배포 상태 확인 중...
✅ 웹 컨테이너 정상 실행 중

======================================================================
  🎉 배포 완료!
======================================================================

📊 배포 정보:
  - 환경: prod
  - 버전: v2.11.0
  - 완료 시간: 2025-11-01 12:15:00

🔗 접속 정보:
  - URL: http://192.168.0.100:3000
  - 또는: http://localhost:3000
======================================================================
```

**소요 시간:** 약 **10~15분**

---

### 방법 2: 수동 배포

```bash
# 1. 기존 컨테이너 중지
docker-compose -f docker-compose.prod.yml down

# 2. 프로덕션 이미지 빌드
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. 컨테이너 시작
docker-compose -f docker-compose.prod.yml up -d

# 4. 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

---

## 배포 후 검증

### 1. 컨테이너 상태 확인

```bash
docker-compose -f docker-compose.prod.yml ps
```

**예상 출력:**
```
NAME                     STATUS          PORTS
naver-crawler-web        Up 2 minutes    0.0.0.0:3000->3000/tcp
naver-crawler-db         Up 2 minutes    5432/tcp
naver-crawler-redis      Up 2 minutes    6379/tcp
```

---

### 2. 로그 확인

```bash
# 실시간 로그
docker-compose -f docker-compose.prod.yml logs -f web

# 최근 100줄
docker-compose -f docker-compose.prod.yml logs --tail=100 web
```

**정상 로그 예시:**
```
web_1  | ▲ Next.js 14.2.3
web_1  | - Local:        http://localhost:3000
web_1  | - Production:   http://0.0.0.0:3000
web_1  |
web_1  | ✓ Ready in 1.5s
```

---

### 3. 프로덕션 모드 확인

```bash
# 컨테이너 내부 확인
docker-compose -f docker-compose.prod.yml exec web env | grep NODE_ENV
```

**예상 출력:**
```
NODE_ENV=production
```

---

### 4. 빌드 결과 확인

```bash
# .next 디렉토리 확인 (컨테이너 내부)
docker-compose -f docker-compose.prod.yml exec web ls -lah /app/.next
```

**빌드된 파일이 있어야 함:**
```
drwxr-xr-x  5 root root 4.0K Nov  1 12:10 .next
-rw-r--r--  1 root root  15K Nov  1 12:10 build-manifest.json
-rw-r--r--  1 root root 2.5K Nov  1 12:10 routes-manifest.json
```

---

### 5. 성능 확인

```bash
# 메모리 사용량 확인
docker stats --no-stream naver-crawler-web
```

**프로덕션 모드가 개발 모드보다 100~200MB 적게 사용해야 정상**

---

### 6. 헬스 체크

```bash
curl http://localhost:3000/api/health
```

**예상 응답:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-01T12:15:00.000Z",
  "version": "2.11.0",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

---

## 프로덕션 → 개발 모드 전환

프로덕션 모드로 배포 후 다시 개발 모드로 돌아가려면:

```bash
# 1. 프로덕션 컨테이너 중지
docker-compose -f docker-compose.prod.yml down

# 2. 개발 모드로 시작
docker-compose up -d

# 또는 배포 스크립트 사용
./deploy-to-nas.sh dev
```

**참고:** 데이터는 유지됩니다 (볼륨 공유)

---

## 문제 해결

### 문제 1: 빌드 실패 - ENOSPC (디스크 공간 부족)

```bash
ERROR: ENOSPC: no space left on device
```

**해결:**

```bash
# 1. 디스크 공간 확인
df -h

# 2. Docker 정리
docker system prune -a --volumes

# 3. 재시도
./deploy-to-nas.sh prod
```

---

### 문제 2: 빌드 너무 오래 걸림 (20분 이상)

**원인:** 네트워크 속도, NAS 성능

**해결:**

```bash
# 캐시 사용 (--no-cache 제거)
docker-compose -f docker-compose.prod.yml build

# 또는 미리 빌드된 이미지 사용 (향후 Docker Hub 배포 시)
```

---

### 문제 3: 프로덕션 모드인데도 Hot Reload 동작

**확인:**

```bash
# NODE_ENV 확인
docker-compose -f docker-compose.prod.yml exec web env | grep NODE_ENV

# 올바른 compose 파일 사용 확인
docker-compose -f docker-compose.prod.yml ps
```

**해결:**

```bash
# 프로덕션 compose 파일 사용 확인
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

### 문제 4: 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs web

# 일반적인 원인:
# 1. Next.js 빌드 실패
# 2. 환경 변수 누락
# 3. 포트 충돌
```

**해결:**

```bash
# 빌드 로그 상세 확인
docker-compose -f docker-compose.prod.yml build --no-cache 2>&1 | tee build.log

# config.env 확인
cat config.env | grep -v '^#' | grep -v '^$'
```

---

### 문제 5: 데이터베이스 연결 실패

```bash
Error: Connection refused at 5432
```

**해결:**

```bash
# DB 컨테이너 상태 확인
docker-compose -f docker-compose.prod.yml ps db

# DB 재시작
docker-compose -f docker-compose.prod.yml restart db

# 헬스 체크 대기
docker-compose -f docker-compose.prod.yml logs db | grep "ready"
```

---

## 프로덕션 vs 개발 모드 비교표

| 항목 | 개발 모드 | 프로덕션 모드 |
|------|-----------|---------------|
| **배포 시간** | 3~5초 | 10~15분 |
| **Hot Reload** | ✅ 활성화 | ❌ 비활성화 |
| **메모리 사용** | ~500MB | ~300MB |
| **빌드 최적화** | ❌ 없음 | ✅ 압축, 캐싱 |
| **NODE_ENV** | development | production |
| **소스맵** | ✅ 포함 | ❌ 제거 |
| **디버깅** | ✅ 편리 | ⚠️ 제한적 |
| **코드 변경** | 즉시 반영 | 재빌드 필요 |
| **적합 환경** | 개인 NAS | 공용 NAS |

---

## 권장 사항

### 개인 NAS 사용자 (1~2명)

**권장:** 개발 모드 (기본값)

**이유:**
- 빠른 배포 (3초)
- Hot Reload로 편리한 수정
- 성능 차이 미미

```bash
./deploy-to-nas.sh dev
```

---

### 공용 NAS 사용자 (3명 이상)

**권장:** 프로덕션 모드

**이유:**
- 메모리 사용량 30% 절감
- 안정적인 운영
- 최적화된 성능

```bash
./deploy-to-nas.sh prod
```

---

### 혼합 사용 (개발 + 운영)

**전략:**
1. 평소: 개발 모드 (빠른 수정)
2. 중요 업데이트 후: 프로덕션 모드 (안정화)
3. 버그 수정: 개발 모드로 전환 → 수정 → 프로덕션 재배포

```bash
# 버그 수정 시
./deploy-to-nas.sh dev
# 수정 완료
# 코드 수정...
# 검증 완료

# 프로덕션 재배포
./deploy-to-nas.sh prod
```

---

## 추가 리소스

- **[NAS_DEPLOYMENT_GUIDE.md](NAS_DEPLOYMENT_GUIDE.md)** - 전체 배포 가이드
- **[DEPLOYMENT_ANALYSIS.md](../DEPLOYMENT_ANALYSIS.md)** - 배포 분석 보고서
- **[README.md](../README.md)** - 프로젝트 개요

---

**Made with ❤️ for NAS users**
