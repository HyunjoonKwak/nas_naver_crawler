# NAS 배포 가이드 (v2.11.0)

이 문서는 Naver Real Estate Crawler를 NAS 환경에 배포하는 전체 프로세스를 설명합니다.

## 목차

1. [사전 준비사항](#사전-준비사항)
2. [초기 설정](#초기-설정)
3. [배포 실행](#배포-실행)
4. [배포 검증](#배포-검증)
5. [문제 해결](#문제-해결)
6. [롤백 가이드](#롤백-가이드)

---

## 사전 준비사항

### 필수 소프트웨어

```bash
# Docker & Docker Compose 버전 확인
docker --version           # Docker 20.10 이상 권장
docker-compose --version   # Docker Compose V2 (2.x) 권장

# Git 확인
git --version              # Git 2.x 이상
```

### 시스템 요구사항

- **NAS 모델**: Synology, QNAP 등 Docker 지원 모델
- **CPU**: 2 코어 이상
- **메모리**: 4GB 이상 (8GB 권장)
- **디스크**: 20GB 이상 여유 공간

### 네트워크 포트

| 서비스 | 포트 | 용도 |
|--------|------|------|
| Web (Next.js) | 3000 | 웹 UI 및 API |
| PostgreSQL | 5432 | 데이터베이스 (내부) |
| Redis | 6379 | 캐시 (내부) |

---

## 초기 설정

### 1. 프로젝트 클론

```bash
# NAS에 SSH 접속 후
cd /volume1/docker
git clone <repository-url> naver-crawler
cd naver-crawler
```

### 2. 환경 변수 설정

```bash
# config.env.example을 복사하여 config.env 생성
cp config.env.example config.env

# 환경 변수 편집
vi config.env
```

**필수 설정 항목:**

```bash
# Database (기본값 사용 가능)
DATABASE_URL="postgresql://crawler_user:crawler_password@db:5432/naver_crawler"

# NextAuth
NEXTAUTH_SECRET="<랜덤 32자 이상의 문자열>"  # 필수!
NEXTAUTH_URL="http://<NAS_IP>:3000"

# 관리자 계정 (초기 가입 시 자동 승인)
ADMIN_EMAIL="admin@example.com"

# Naver API (크롤러용)
NAVER_CLIENT_ID="<네이버 개발자센터에서 발급>"
NAVER_CLIENT_SECRET="<네이버 개발자센터에서 발급>"

# 실거래가 API (선택)
PUBLIC_DATA_SERVICE_KEY="<공공데이터포털에서 발급>"
MOLIT_SERVICE_KEY="<국토교통부 API 키>"

# Kakao Geocoding API (선택)
KAKAO_REST_API_KEY="<카카오 개발자센터에서 발급>"

# Email (선택 - 알림 기능 사용 시)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Redis (선택 - 성능 향상)
REDIS_URL="redis://redis:6379"

# 환경 설정
NODE_ENV="production"
LOG_LEVEL="info"  # debug, info, warn, error
```

**NEXTAUTH_SECRET 생성 방법:**

```bash
# OpenSSL 사용
openssl rand -base64 32

# Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 심볼릭 링크 생성

```bash
# .env → config.env 심볼릭 링크 (Next.js 자동 로드용)
ln -sf config.env .env

# 확인
ls -lah .env  # .env -> config.env
```

### 4. 배포 스크립트 실행 권한 부여

```bash
chmod +x deploy-to-nas.sh
chmod +x manage.sh
```

---

## 배포 실행

### 개발 모드 (Development) - 권장

**특징:**
- Hot Reload 활성화 (코드 변경 시 자동 재시작)
- 빠른 배포 (3초 재시작)
- 디버깅 편리

```bash
# 방법 1: 배포 스크립트 사용
./deploy-to-nas.sh dev

# 방법 2: Docker Compose 직접 실행
docker-compose -f docker-compose.dev.yml up -d
```

**배포 프로세스:**
1. 사전 요구사항 체크 (Docker, config.env)
2. Git 상태 확인
3. 컨테이너 재시작 (web 서비스만)
4. 배포 검증 (헬스 체크)

**소요 시간:** 약 10초

### 프로덕션 모드 (Production)

**특징:**
- 최적화된 빌드 (압축, 캐싱)
- 안정성 우선
- Hot Reload 비활성화

```bash
# 방법 1: 배포 스크립트 사용 (권장)
./deploy-to-nas.sh prod

# 방법 2: Docker Compose 직접 실행
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**배포 프로세스:**
1. 사전 요구사항 체크
2. Git 상태 확인
3. 기존 컨테이너 중지
4. 이미지 빌드 (5~10분 소요)
5. 컨테이너 시작
6. 배포 검증

**소요 시간:** 약 10~15분

---

## 배포 검증

### 1. 컨테이너 상태 확인

```bash
# 모든 컨테이너 상태
docker-compose ps

# 예상 출력:
# NAME              STATUS          PORTS
# naver-crawler-web    Up 2 minutes    0.0.0.0:3000->3000/tcp
# naver-crawler-db     Up 2 minutes    5432/tcp
# naver-crawler-redis  Up 2 minutes    6379/tcp
```

### 2. 로그 확인

```bash
# 전체 로그 (실시간)
docker-compose logs -f

# 웹 서비스만
docker-compose logs -f web

# 최근 100줄
docker-compose logs --tail=100 web

# 에러만 필터링
docker-compose logs web | grep -i error
```

### 3. 헬스 체크

```bash
# 헬스 체크 API 호출
curl http://localhost:3000/api/health

# 예상 응답 (healthy):
{
  "status": "healthy",
  "timestamp": "2025-11-01T10:00:00.000Z",
  "version": "2.11.0",
  "checks": {
    "database": { "status": "ok", "responseTime": 2, "message": "Database connected" },
    "redis": { "status": "ok", "message": "Redis connected" },
    "disk": { "status": "ok", "crawledDataSize": "1.23 MB", "message": "Disk space available" },
    "uptime": 120.5
  },
  "responseTime": 5
}
```

### 4. 웹 UI 접속

브라우저에서 접속:
```
http://<NAS_IP>:3000
```

**확인 사항:**
- [ ] 로그인 페이지 정상 표시
- [ ] 로그인 후 대시보드 표시
- [ ] 단지 목록 로딩
- [ ] 네트워크 요청 정상 (개발자 도구 확인)

### 5. 데이터베이스 연결 확인

```bash
# PostgreSQL 접속
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler

# 테이블 확인
\dt

# 사용자 수 확인
SELECT COUNT(*) FROM "User";

# 종료
\q
```

### 6. Redis 연결 확인

```bash
# Redis 접속
docker exec -it naver-crawler-redis redis-cli

# 연결 테스트
PING  # 응답: PONG

# 키 개수 확인
DBSIZE

# 종료
exit
```

---

## 문제 해결

### 1. 컨테이너가 시작되지 않음

**증상:**
```bash
docker-compose ps
# STATUS: Exited (1)
```

**해결:**

```bash
# 로그 확인
docker-compose logs web

# 일반적인 원인:
# 1. config.env 파일 누락
ls -la config.env

# 2. NEXTAUTH_SECRET 미설정
grep NEXTAUTH_SECRET config.env

# 3. 포트 충돌
sudo lsof -i :3000  # 3000 포트 사용 중인 프로세스 확인

# 해결: 기존 프로세스 종료 또는 포트 변경
# docker-compose.yml에서 "3001:3000"으로 변경
```

### 2. 데이터베이스 연결 실패

**증상:**
```
Error: Connection refused at 5432
```

**해결:**

```bash
# DB 컨테이너 상태 확인
docker-compose ps db

# DB 로그 확인
docker-compose logs db

# DB 재시작
docker-compose restart db

# DB 완전 초기화 (주의: 데이터 삭제됨)
docker-compose down -v  # 볼륨 삭제
docker-compose up -d
```

### 3. Redis 연결 실패

**증상:**
```
WARN: Redis not configured
```

**참고:** Redis는 선택적 의존성입니다. 없어도 애플리케이션은 작동하지만 성능이 저하됩니다.

**해결:**

```bash
# config.env에 Redis URL 추가
echo 'REDIS_URL="redis://redis:6379"' >> config.env

# Redis 컨테이너 시작
docker-compose up -d redis

# 재시작
docker-compose restart web
```

### 4. 권한 오류 (Permission Denied)

**증상:**
```
Error: EACCES: permission denied, mkdir '/app/logs'
```

**해결:**

```bash
# 로그 디렉토리 권한 수정
mkdir -p logs
chmod 755 logs

# 또는 Docker 컨테이너 내부에서 해결
docker-compose exec web mkdir -p /app/logs
docker-compose exec web chmod 755 /app/logs
```

### 5. 빌드 실패 (ENOSPC)

**증상:**
```
Error: ENOSPC: no space left on device
```

**해결:**

```bash
# 디스크 용량 확인
df -h

# Docker 이미지 정리
docker system prune -a --volumes  # 주의: 모든 미사용 리소스 삭제

# 또는 단계별 정리
docker image prune -a    # 미사용 이미지 삭제
docker volume prune      # 미사용 볼륨 삭제
docker container prune   # 중지된 컨테이너 삭제
```

### 6. Hot Reload 작동 안 함

**증상:** 코드 변경 후 자동 재시작이 안 됨

**해결:**

```bash
# 개발 모드인지 확인
docker-compose ps

# docker-compose.dev.yml 사용 여부 확인
docker-compose -f docker-compose.dev.yml ps

# 볼륨 마운트 확인
docker-compose exec web ls -la /app

# 수동 재시작
docker-compose restart web
```

### 7. 환경 변수 변경이 반영 안 됨

**증상:** config.env 수정 후에도 이전 값 사용

**해결:**

```bash
# 컨테이너 재생성 (환경 변수 다시 로드)
docker-compose down
docker-compose up -d

# 또는 재시작만
docker-compose restart web
```

---

## 롤백 가이드

### 이전 버전으로 되돌리기

```bash
# 1. Git 로그 확인
git log --oneline -10

# 2. 특정 커밋으로 체크아웃
git checkout <commit-hash>

# 예: git checkout 3011406

# 3. 재배포
./deploy-to-nas.sh prod

# 4. 검증 후 문제 없으면 하드 리셋 (선택)
# git reset --hard <commit-hash>
```

### Docker 이미지 버전 관리

```bash
# 현재 이미지 백업
docker tag naver-crawler-web:latest naver-crawler-web:backup-$(date +%Y%m%d)

# 이미지 목록 확인
docker images | grep naver-crawler

# 이전 이미지로 롤백
docker tag naver-crawler-web:backup-20251101 naver-crawler-web:latest
docker-compose up -d
```

### 데이터베이스 백업 & 복원

**백업:**

```bash
# PostgreSQL 백업
docker exec naver-crawler-db pg_dump -U crawler_user naver_crawler > backup-$(date +%Y%m%d).sql

# 또는 Docker 볼륨 백업
docker run --rm -v naver-crawler_db-data:/data -v $(pwd):/backup ubuntu tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz /data
```

**복원:**

```bash
# SQL 파일에서 복원
cat backup-20251101.sql | docker exec -i naver-crawler-db psql -U crawler_user naver_crawler

# 볼륨에서 복원
docker run --rm -v naver-crawler_db-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/db-backup-20251101.tar.gz -C /
docker-compose restart db
```

---

## 배포 체크리스트

### 배포 전

- [ ] Git 상태 확인 (커밋 완료)
- [ ] config.env 백업
- [ ] 데이터베이스 백업
- [ ] 현재 버전 기록 (git log)
- [ ] 디스크 용량 확인 (최소 5GB 여유)
- [ ] 사용자에게 점검 공지 (프로덕션인 경우)

### 배포 중

- [ ] 배포 스크립트 실행
- [ ] 로그 모니터링 (에러 확인)
- [ ] 컨테이너 상태 확인

### 배포 후

- [ ] 헬스 체크 API 확인
- [ ] 웹 UI 접속 테스트
- [ ] 주요 기능 테스트 (로그인, 크롤링, 알림)
- [ ] 로그 확인 (에러 없는지)
- [ ] 성능 확인 (응답 시간)
- [ ] 사용자에게 배포 완료 공지

---

## 모니터링 및 유지보수

### 정기 점검 항목

**일간:**
- [ ] 컨테이너 상태 확인
- [ ] 로그 확인 (에러 검색)
- [ ] 디스크 용량 확인

**주간:**
- [ ] 데이터베이스 백업
- [ ] 로그 파일 정리
- [ ] Docker 이미지 정리

**월간:**
- [ ] 보안 업데이트 확인
- [ ] 의존성 업데이트 (npm audit)
- [ ] 성능 지표 검토

### 자동화 스크립트

**디스크 정리:**

```bash
# 30일 이상 된 로그 파일 삭제
find logs/ -name "*.log" -mtime +30 -delete

# Docker 시스템 정리
docker system prune -f
```

**헬스 체크 자동화 (crontab):**

```bash
# crontab -e
*/5 * * * * curl -f http://localhost:3000/api/health || echo "Health check failed" | mail -s "NAS Crawler Alert" admin@example.com
```

---

## 추가 리소스

- **프로젝트 문서**: [README.md](../README.md)
- **환경 변수 가이드**: [ENV_SETUP.md](./ENV_SETUP.md)
- **API 문서**: [SITEMAP.md](../SITEMAP.md)
- **변경 이력**: [CHANGELOG.md](../CHANGELOG.md)
- **보안 가이드**: [SECURITY.md](../SECURITY.md)

---

## 연락처

문제 발생 시:
1. GitHub Issues: [프로젝트 이슈 페이지]
2. 로그 첨부 (`docker-compose logs --tail=200 web`)
3. 환경 정보 포함 (NAS 모델, Docker 버전 등)
