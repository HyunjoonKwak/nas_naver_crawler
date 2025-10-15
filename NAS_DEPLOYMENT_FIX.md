# NAS 배포 에러 해결 가이드

## 발생한 에러

### 1. Module not found 에러 (Next.js)
```
Module not found: Can't resolve '@/hooks/useCrawlEvents'
```

### 2. PostgreSQL 연결 종료 에러 (Prisma)
```
Error in PostgreSQL connection: terminating connection due to administrator command
```

## 해결 방법

### 문제 1: Module not found

**원인**: Docker 빌드 중 `hooks` 폴더가 포함되지 않았거나, Next.js 캐시 문제

**해결**:

```bash
# NAS SSH 접속 후
cd /volume1/docker/nas_naver_crawler

# 1. 완전히 클린 빌드
docker-compose down
docker system prune -f  # 캐시 정리
docker-compose up -d --build --force-recreate

# 또는 더 강력한 방법:
docker-compose down -v  # 볼륨도 삭제
docker rmi $(docker images -q nas_naver_crawler) -f  # 이미지 삭제
docker-compose up -d --build
```

### 문제 2: PostgreSQL 연결 풀 설정

**원인**: Prisma가 PostgreSQL과의 연결을 오래 유지하다가 PostgreSQL이 연결을 강제 종료

**해결**: `.env` 파일의 `DATABASE_URL`에 connection pool 파라미터 추가

#### 현재 설정 (문제):
```env
DATABASE_URL="postgresql://user:password@postgres:5432/dbname"
```

#### 개선된 설정 (해결):
```env
DATABASE_URL="postgresql://user:password@postgres:5432/dbname?connection_limit=10&pool_timeout=20&connect_timeout=10"
```

**파라미터 설명**:
- `connection_limit=10`: 최대 연결 수를 10개로 제한
- `pool_timeout=20`: 연결 풀에서 연결을 얻기 위한 최대 대기 시간 (초)
- `connect_timeout=10`: PostgreSQL 연결 시도 타임아웃 (초)

### NAS 배포 전체 절차

```bash
# 1. SSH 접속
ssh your-nas-user@nas-ip

# 2. 프로젝트 디렉토리로 이동
cd /volume1/docker/nas_naver_crawler

# 3. 최신 코드 가져오기
git pull origin main

# 4. .env 파일 수정 (connection pool 파라미터 추가)
nano .env
# DATABASE_URL 수정 후 Ctrl+X, Y, Enter로 저장

# 5. 완전히 클린 빌드
docker-compose down
docker system prune -f
docker-compose up -d --build

# 6. 로그 확인
docker logs nas_naver_crawler -f

# 정상 작동 확인 메시지:
# - "🚀 Server starting - Initializing schedulers..."
# - "✅ Scheduler initialization complete"
# - "[SSE] Client connected"
```

## 로그 확인 방법

### 1. 스케줄러 초기화 확인
```bash
docker logs nas_naver_crawler 2>&1 | grep -i scheduler
```

**정상 출력**:
```
🚀 Server starting - Initializing schedulers...
📅 Loading all active schedules...
✅ Schedule registered: [ID] (30 10 * * 1,2,3,4,5)
✅ Scheduler initialization complete: 1 schedule(s) loaded
```

### 2. SSE 연결 확인
```bash
docker logs nas_naver_crawler 2>&1 | grep -i sse
```

**정상 출력**:
```
[SSE] Client connected. Total clients: 1
[SSE] Broadcasting event: crawl-start to 1 clients
```

### 3. Prisma 에러 확인
```bash
docker logs nas_naver_crawler 2>&1 | grep -i prisma
```

**문제 있을 시**:
```
prisma:error Error in PostgreSQL connection
```

**정상 시**: 에러 메시지 없음

## 배포 후 웹 UI 확인

1. **홈페이지 접속**: `http://your-nas-ip:3000`
2. **브라우저 개발자 도구 열기** (F12)
3. **Console 탭에서 확인**:
   ```
   [SSE] Connecting to event stream...
   [SSE] Connected
   [SSE] Connection established
   ```
4. **스케줄러 페이지**에서 "즉시 실행" 테스트

## 트러블슈팅

### Module not found가 계속 발생하는 경우

```bash
# 1. 빌드 컨텍스트 확인
cd /volume1/docker/nas_naver_crawler
ls -la hooks/  # hooks 폴더가 있는지 확인

# 2. Docker 빌드 로그 확인
docker-compose build --no-cache 2>&1 | tee build.log

# 3. 컨테이너 내부 파일 확인
docker exec -it nas_naver_crawler sh
ls -la /app/hooks/
exit
```

### PostgreSQL 연결 에러가 계속 발생하는 경우

```bash
# 1. PostgreSQL 컨테이너 상태 확인
docker ps | grep postgres

# 2. PostgreSQL 로그 확인
docker logs nas_postgres

# 3. 연결 테스트
docker exec -it nas_naver_crawler sh
psql $DATABASE_URL -c "SELECT 1"
exit

# 4. PostgreSQL 재시작
docker-compose restart postgres
docker-compose restart nas_naver_crawler
```

### 완전 초기화가 필요한 경우

```bash
# 경고: 모든 Docker 데이터가 삭제됩니다
cd /volume1/docker/nas_naver_crawler
docker-compose down -v
docker system prune -a -f --volumes
git pull origin main
docker-compose up -d --build
```

## 성공 확인 체크리스트

- [ ] `docker logs nas_naver_crawler`에서 에러 메시지 없음
- [ ] 스케줄러 초기화 완료 메시지 확인
- [ ] 웹 UI 접속 가능
- [ ] 브라우저 콘솔에서 SSE 연결 확인
- [ ] 스케줄러 "즉시 실행" 정상 동작
- [ ] 토스트 알림 즉시 표시
- [ ] 크롤링 진행 배너 표시

모든 항목이 체크되면 배포 성공! 🎉
