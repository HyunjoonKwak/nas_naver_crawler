# 🚀 배포 가이드

> **NAS 환경에서 네이버 부동산 크롤러를 배포하는 완전한 가이드**

---

## 📋 목차

1. [배포 전 준비](#-배포-전-준비)
2. [배포 방법](#-배포-방법)
3. [Hot Reload 개발 모드](#-hot-reload-개발-모드-권장)
4. [프로덕션 빌드 모드](#-프로덕션-빌드-모드)
5. [PostgreSQL 설정](#-postgresql-설정)
6. [문제 해결](#-문제-해결)

---

## 🎯 배포 전 준비

### 시스템 요구사항

- **CPU**: 최소 2코어 (권장: 4코어)
- **RAM**: 최소 4GB (권장: 8GB)
- **저장공간**: 최소 2GB
- **Docker**: 20.10 이상
- **Docker Compose**: 2.0 이상

### 백업

```bash
# 기존 데이터 백업
cd /volume1/code_work/nas_naver_crawler
cp -r crawled_data/ crawled_data_backup/
```

---

## 🚀 배포 방법

### 방법 1: Hot Reload 개발 모드 ⭐ 추천

**장점:**
- ✅ 빌드 시간 없음 (즉시 배포)
- ✅ 코드 변경 자동 반영
- ✅ `git pull` 후 3초 내 적용

**사용 시나리오:**
- 개발/테스트 환경
- 빈번한 코드 수정
- NAS 성능이 낮은 경우

```bash
# 1. 최신 코드 가져오기
cd /volume1/code_work/nas_naver_crawler
git pull origin main

# 2. 최초 실행 (첫 배포만)
docker-compose up -d --build

# 3. 이후 배포 (빌드 없이)
git pull origin main
docker-compose restart web  # 또는 Hot Reload로 자동 반영

# 4. 로그 확인
docker-compose logs -f web
```

**완료 메시지:**
```
✓ Ready in 3s
○ Local: http://localhost:3000
```

---

### 방법 2: Mac에서 빌드 후 NAS 전송

**장점:**
- ✅ Mac의 빠른 CPU 활용 (5배 빠름)
- ✅ NAS 리소스 절약
- ✅ 프로덕션 최적화 이미지

**사용 시나리오:**
- 프로덕션 배포
- 최종 성능 최적화 필요
- Mac 개발 환경 보유

```bash
# Mac에서 실행
cd /Users/specialrisk_mac/code_work/nas_naver_crawler
./scripts/build_and_export.sh
```

스크립트가 자동으로:
1. Mac에서 Docker 이미지 빌드
2. 이미지를 tar 파일로 저장
3. NAS로 SCP 전송
4. NAS에서 이미지 로드

```bash
# NAS에서 실행
ssh admin@[NAS-IP]
cd /volume1/code_work/nas_naver_crawler
docker-compose up -d
```

**예상 시간:**
- Mac 빌드: 3-5분
- 전송: 2-3분
- **총: 5-8분**

---

### 방법 3: NAS에서 직접 프로덕션 빌드

**장점:**
- ✅ 프로덕션 최적화
- ✅ Mac 없이 독립 배포

**단점:**
- ⚠️ 빌드 시간 15-30분
- ⚠️ NAS 리소스 많이 사용

```bash
# NAS에서 실행
cd /volume1/code_work/nas_naver_crawler
git pull origin main

# 프로덕션 모드로 빌드
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🔥 Hot Reload 개발 모드 (권장)

### 작동 방식

코드 변경 → 자동 감지 (3초) → 재컴파일 → 브라우저 자동 새로고침

### 자동 반영되는 파일

- `app/**/*.tsx` - 페이지
- `components/**/*.tsx` - 컴포넌트
- `lib/**/*.ts` - 유틸리티
- CSS/Tailwind 변경

### 재시작 필요한 경우

- `next.config.js` 변경
- `package.json` 변경
- `prisma/schema.prisma` 변경
- 환경 변수 변경

```bash
# 재시작 명령어
docker-compose restart web
```

### 배포 워크플로우

```bash
# 1. 코드 수정 (로컬 또는 SFTP)
# 2. Git push
git add .
git commit -m "feat: 새 기능 추가"
git push

# 3. NAS에서 pull
ssh admin@[NAS-IP]
cd /volume1/code_work/nas_naver_crawler
git pull

# 4. 자동 반영 확인 (3-5초 대기)
# 또는 강제 재시작
docker-compose restart web
```

---

## 📦 프로덕션 빌드 모드

### 개발 모드 → 프로덕션 모드 전환

#### 1. Dockerfile 변경

```yaml
# docker-compose.yml
web:
  build:
    context: .
    dockerfile: Dockerfile  # Dockerfile.dev → Dockerfile
  command: npm start  # npm run dev → npm start
```

#### 2. 재빌드

```bash
# Mac에서 (빠름)
./scripts/build_and_export.sh

# 또는 NAS에서 (느림)
docker-compose build --no-cache
docker-compose up -d
```

### 모드 비교

| 항목 | 개발 모드 | 프로덕션 모드 |
|------|----------|-------------|
| 빌드 시간 | 최초 1회 (3-5분) | 매번 (15-30분) |
| Hot Reload | ✅ 자동 | ❌ 재빌드 필요 |
| 성능 | 보통 | 최적화됨 (+30%) |
| 메모리 | 1.5GB | 1GB |
| 배포 속도 | ⚡ 즉시 | 🐢 느림 |
| 용도 | 개발/테스트 | 운영 환경 |

---

## 🗄️ PostgreSQL 설정

### 최초 설정

#### 1. 환경 변수 설정

```bash
# config.env에서 .env로 복사
cp config.env .env

# .env 확인
cat .env | grep DATABASE_URL
```

**기본값 (수정 불필요):**
```env
DATABASE_URL="postgresql://crawler_user:crawler_pass_2025@db:5432/naver_crawler?schema=public"
```

#### 2. 컨테이너 시작

```bash
# PostgreSQL 포함 시작
docker-compose up -d

# 컨테이너 상태 확인
docker-compose ps

# 예상 결과:
# naver-crawler-db   running   0.0.0.0:5433->5432/tcp
# naver-crawler-web  running   0.0.0.0:3000->3000/tcp
```

#### 3. Prisma 마이그레이션

```bash
# 웹 컨테이너 접속
docker exec -it naver-crawler-web sh

# Prisma Client 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate
# 또는: npx prisma migrate deploy

# 종료
exit
```

#### 4. DB 연결 테스트

```bash
# 테스트 실행
docker exec -it naver-crawler-web node scripts/test-db.mjs

# 예상 결과:
# ✅ Database connected successfully!
# 📊 Database Status:
#   - Complexes: 0
#   - Articles: 0
#   - Crawl History: 0
# 🎉 All tests passed!
```

### PostgreSQL 관리 명령어

```bash
# Prisma Studio 실행 (GUI)
docker exec -it naver-crawler-web npm run db:studio
# 접속: http://localhost:5555

# 데이터베이스 직접 접속
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler

# 스키마 확인
docker exec -it naver-crawler-web npx prisma db pull
```

### 포트 충돌 해결

NAS에 기존 PostgreSQL이 있는 경우 (이미 해결됨):

```yaml
# docker-compose.yml
db:
  ports:
    - "5433:5432"  # 외부: 5433, 내부: 5432
```

---

## 🔧 문제 해결

### 1. Hot Reload가 작동하지 않음

```bash
# 컨테이너 재시작
docker-compose restart web

# 로그 확인
docker-compose logs -f web

# 캐시 삭제 후 재빌드
docker-compose build --no-cache web
docker-compose up -d
```

### 2. Prisma Client 생성 실패

```bash
# 의존성 재설치
docker exec -it naver-crawler-web npm install

# Prisma 재생성
docker exec -it naver-crawler-web npm run db:generate

# 컨테이너 재시작
docker-compose restart web
```

### 3. 마이그레이션 실패

```bash
# DB 컨테이너 상태 확인
docker-compose logs db

# "database system is ready" 확인 후 재시도
docker exec -it naver-crawler-web npx prisma migrate deploy
```

### 4. 웹 컨테이너 DB 연결 실패

```bash
# 환경 변수 확인
docker exec -it naver-crawler-web env | grep DATABASE_URL

# 결과: DATABASE_URL=postgresql://...@db:5432/...
# 주의: 호스트명이 'db'여야 함 (localhost 아님!)

# docker-compose.yml의 depends_on 확인
# web 컨테이너가 db에 의존하는지 확인
```

### 5. 빌드 시간이 너무 오래 걸림

```bash
# Mac에서 빌드 후 전송 (권장)
./scripts/build_and_export.sh

# 또는 개발 모드로 전환 (Hot Reload)
# docker-compose.yml에서 Dockerfile.dev 사용
```

### 6. 메모리 부족 오류

```yaml
# docker-compose.yml
services:
  web:
    deploy:
      resources:
        limits:
          memory: 4G  # 2G에서 4G로 증가
```

### 7. 네트워크 연결 오류

```bash
# DNS 설정 추가
docker run --dns=8.8.8.8 --dns=8.8.4.4 naver-crawler
```

---

## ✅ 배포 체크리스트

### 최초 배포

- [ ] Git 최신 코드 pull
- [ ] .env 파일 설정
- [ ] Docker 이미지 빌드
- [ ] 컨테이너 시작 (web, db)
- [ ] PostgreSQL 헬스체크
- [ ] Prisma 마이그레이션
- [ ] DB 연결 테스트
- [ ] 웹 페이지 접속 확인
- [ ] 크롤링 기능 테스트

### 이후 배포

- [ ] Git pull
- [ ] Prisma 스키마 변경 시 마이그레이션
- [ ] 컨테이너 재시작 (또는 Hot Reload 대기)
- [ ] 로그 확인
- [ ] 기능 테스트

---

## 🎯 추천 배포 전략

### 개발/테스트 환경

```bash
# Hot Reload 개발 모드 사용
docker-compose up -d

# 코드 수정 → git push → git pull → 자동 반영
```

### 프로덕션 환경

```bash
# Mac에서 빌드 후 전송
./scripts/build_and_export.sh

# 또는 GitHub Actions CI/CD 구축
```

---

## 📊 성능 비교

```
빌드 방법별 소요 시간 (5개 단지 크롤링 기준):

Mac 빌드:          5-8분 (빌드) + 4분 (크롤링) = 9-12분
NAS 직접 빌드:     15-30분 (빌드) + 4분 (크롤링) = 19-34분
Hot Reload:        0분 (빌드) + 4분 (크롤링) = 4분 ⭐

권장: 개발은 Hot Reload, 운영은 Mac 빌드
```

---

## 🔐 보안 주의사항

1. **환경 변수 보호**
   - `.env` 파일 Git 커밋 금지
   - 데이터베이스 비밀번호 변경 (운영 환경)

2. **포트 노출 제한**
   - 필요한 포트만 열기
   - 방화벽 설정

3. **정기 업데이트**
   - Docker 이미지 업데이트
   - 의존성 패키지 업데이트

---

**작성일**: 2025-01-15
**상태**: ✅ 통합 완료 (QUICK_DEPLOY + NAS_DEPLOYMENT + DEV_MODE)
