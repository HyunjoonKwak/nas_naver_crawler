# NAS Docker 배포 가이드

## 목차
1. [배포 과정에서 발생한 문제들](#배포-과정에서-발생한-문제들)
2. [문제 발생 원인 분석](#문제-발생-원인-분석)
3. [올바른 배포 프로세스](#올바른-배포-프로세스)
4. [체크리스트](#배포-체크리스트)

---

## 배포 과정에서 발생한 문제들

### 1. Docker 빌드 캐시로 인한 루트 파티션 고갈
**문제:**
- Docker 빌드 중 루트 파티션(2.3GB)이 100% 사용됨
- 671개의 오래된 Docker 이미지 누적
- 빌드 캐시가 `/var/lib/docker`에 쌓임

**해결:**
```bash
# 오래된 이미지 정리 (21GB 확보)
docker image prune -a -f

# /root/.cache 정리 (155MB 확보)
rm -rf /root/.cache/*
```

**근본 원인:**
- Synology NAS의 루트 파티션은 시스템용으로 2.3GB로 제한됨
- Docker 데이터는 `/volume1/@docker`에 있지만, 빌드 **과정**은 루트의 `/tmp` 사용
- BuildKit 캐시 마운트를 사용하지 않아 매번 캐시가 루트에 쌓임

**영구 해결책:**
```dockerfile
# Dockerfile.dev에 BuildKit 캐시 마운트 추가
# syntax=docker/dockerfile:1.7

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

**왜 한 번에 해결 안 됐나:**
- 처음엔 환경 변수로 해결하려 했으나, 빌드 타임과 런타임 차이를 간과
- `DOCKER_BUILDKIT=1` 환경 변수는 런타임에만 적용됨
- Dockerfile 자체에 `# syntax=` 지시어와 `--mount=type=cache` 필요

---

### 2. Btrfs 스냅샷 busy 문제
**문제:**
```bash
docker rm -f <container_id>
# Error: driver "btrfs" failed to remove root filesystem: device or resource busy
```

**시도한 해결책 (실패):**
- `docker stop` → 여전히 삭제 안 됨
- `docker rm -f` → 실패
- `docker-compose down` → 일부 컨테이너만 삭제됨

**최종 해결:**
```bash
# 1. 컨테이너 중지
docker-compose -f docker-compose.test.yml down

# 2. 볼륨 삭제 시도 안 함 (busy 회피)

# 3. 강제 재생성으로 우회
docker-compose -f docker-compose.test.yml up -d --build --force-recreate --remove-orphans
```

**근본 원인:**
- Synology NAS는 Btrfs 파일시스템 사용
- Btrfs 스냅샷이 삭제되지 않고 busy 상태로 남음
- Docker 데몬 재시작 없이는 완전 정리 불가능

**왜 한 번에 해결 안 됐나:**
- Btrfs의 특성을 몰랐음
- 일반 Linux 환경과 다른 Synology NAS의 특수성
- 볼륨 삭제 대신 `--force-recreate`로 우회하는 방법을 늦게 발견

---

### 3. 누락된 npm 패키지 (4개)
**문제:**
- `bcryptjs` - Module not found
- `@tanstack/react-query` - Module not found
- `lucide-react` - Module not found
- `react-hot-toast` - Module not found

**해결:**
```bash
docker-compose -f docker-compose.test.yml exec web-test npm install bcryptjs @tanstack/react-query lucide-react react-hot-toast
```

**근본 원인:**
- 로컬 개발 중 `npm install --save` 없이 패키지 사용
- package.json과 실제 코드 불일치
- Docker 빌드 시점에 package.json 기준으로 설치되므로 누락

**왜 한 번에 해결 안 됐나:**
- 각 패키지가 다른 페이지/컴포넌트에서 사용됨
- Next.js가 lazy loading하므로 해당 페이지 접속 시에만 에러 발생
- 한 번에 모든 패키지를 확인하지 못함

**영구 해결책:**
```bash
# 빌드 전 package.json 검증
npm install --package-lock-only
git diff package-lock.json  # 변경사항 확인

# 또는 프로덕션 빌드로 미리 확인
npm run build  # 모든 페이지 빌드하여 누락 패키지 조기 발견
```

---

### 4. 환경 변수 미전달
**문제:**
- config.env에 NEXTAUTH_URL, NEXTAUTH_SECRET 추가했으나 컨테이너에 안 들어감
- `docker-compose restart`로는 환경 변수 재로드 안 됨

**시도한 해결책 (실패):**
```bash
docker-compose -f docker-compose.test.yml restart web-test  # 실패
```

**최종 해결:**
```bash
# down으로 컨테이너 삭제 후 재생성
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

**근본 원인:**
- `restart`는 기존 컨테이너를 재시작만 함 (환경 변수 재로드 안 됨)
- 환경 변수는 컨테이너 **생성 시점**에 주입됨
- 변경하려면 컨테이너를 삭제하고 재생성 필요

**왜 한 번에 해결 안 됐나:**
- Docker restart vs recreate 차이를 간과
- 환경 변수가 컨테이너 생성 시점에 고정된다는 사실을 몰랐음

---

### 5. 함수 export 누락
**문제:**
```
Error: validateEnv is not a function
```

**원인:**
```typescript
// lib/env.ts
function validateEnv() { ... }  // export 없음
export const env = validateEnv();
```

**해결:**
```typescript
export function validateEnv() { ... }  // export 추가
export function logEnvInfo() { ... }    // 추가 구현
```

**근본 원인:**
- TypeScript 리팩토링 중 export 키워드 누락
- 로컬 개발 환경에서는 캐시된 빌드로 동작
- Docker에서 clean build 시 에러 발견

**왜 한 번에 해결 안 됐나:**
- 로컬에서 테스트 안 함
- Next.js 개발 모드의 캐시가 문제를 숨김
- Docker 환경에서만 발생하는 문제

---

### 6. DB 마이그레이션 순서 문제
**문제:**
```
Error: relation "users" does not exist
Migration: 20251016163758_add_user_data_separation
```

**시도한 해결책 (실패):**
```bash
npx prisma migrate reset --force  # 실패
npx prisma migrate deploy        # 실패
```

**최종 해결:**
```bash
# 1. 스키마 완전 삭제
psql -U crawler_user -d naver_crawler_test -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. prisma db push 사용 (마이그레이션 우회)
npx prisma db push --force-reset
```

**근본 원인:**
- `20251016163758_add_user_data_separation` 마이그레이션이 users 테이블 참조
- 하지만 이전 마이그레이션에서 users 테이블 생성 안 됨
- 마이그레이션 파일 순서/의존성 문제

**왜 한 번에 해결 안 됐나:**
- Prisma migrate vs db push 차이를 몰랐음
- migrate는 파일 순서대로 실행, db push는 현재 스키마 적용
- 마이그레이션 파일 의존성 검증 부족

---

### 7. Next.js 빌드 캐시 문제
**문제:**
- 코드 변경 후에도 오래된 에러 계속 발생
- import 에러가 수정 후에도 남음

**해결:**
```bash
# .next 캐시 삭제
docker-compose -f docker-compose.test.yml exec web-test rm -rf .next
docker-compose -f docker-compose.test.yml restart web-test
```

**근본 원인:**
- Next.js가 `.next` 디렉토리에 빌드 결과 캐시
- Hot reload가 항상 완벽하게 동작하지 않음
- 특히 타입 변경, export 변경 시 캐시 문제 발생

**왜 한 번에 해결 안 됐나:**
- Next.js 캐시 메커니즘을 간과
- 개발 모드에서도 캐시가 문제될 수 있다는 것을 몰랐음

---

## 문제 발생 원인 분석

### 왜 한 번에 해결되지 않았나?

#### 1. **지식 격차**
- Docker 빌드 타임 vs 런타임 차이
- Btrfs 파일시스템 특성
- Prisma migrate vs db push 차이
- Next.js 캐싱 메커니즘

#### 2. **환경 차이**
- 로컬 macOS vs NAS Synology DSM
- 일반 Linux vs Btrfs
- 개발 모드 vs 프로덕션 모드
- 캐시 있는 환경 vs 클린 빌드

#### 3. **점진적 에러 발견**
- Next.js lazy loading으로 페이지 접속 시에만 에러
- 각 패키지가 다른 컴포넌트에서 사용
- 한 문제 해결 → 다음 문제 노출

#### 4. **문서 부족**
- Synology NAS Docker 배포 가이드 부족
- BuildKit 캐시 마운트 사용법 미숙
- NAS 특화 문제 해결 경험 없음

---

## 올바른 배포 프로세스

### Phase 1: 사전 준비 (로컬)

```bash
# 1. 의존성 검증
npm install --package-lock-only
git diff package-lock.json

# 2. 프로덕션 빌드 테스트 (모든 페이지 검증)
npm run build

# 3. TypeScript 타입 체크
npx tsc --noEmit

# 4. Prisma 스키마 검증
npx prisma validate
npx prisma format

# 5. 변경사항 커밋
git add .
git commit -m "feat: performance improvements"
git push origin perf_improve
```

### Phase 2: NAS 환경 준비

```bash
# 1. 디스크 공간 확인
df -h
# 루트 파티션 최소 500MB 여유 필요

# 2. 오래된 Docker 리소스 정리
docker system df  # 사용량 확인
docker image prune -a -f  # 사용하지 않는 이미지 삭제
docker volume prune -f    # 사용하지 않는 볼륨 삭제

# 3. 환경 변수 파일 준비
cp config.env.example config.env
# config.env 편집 (DB, Redis, Secret 등)

# 4. 필수 환경 변수 검증
grep -E "DATABASE_URL|NEXTAUTH_SECRET|REDIS_URL" config.env
```

### Phase 3: 코드 배포

```bash
# 1. 저장소 클론 또는 풀
git clone <repo_url> /volume1/code_work/nas_naver_test
# 또는
cd /volume1/code_work/nas_naver_test
git pull origin perf_improve

# 2. Dockerfile 검증
cat Dockerfile.dev | grep "syntax=docker/dockerfile"
# "# syntax=docker/dockerfile:1.7" 있어야 함

# 3. .dockerignore 확인
cat .dockerignore
# node_modules, .git, .next 등 제외되어야 함
```

### Phase 4: Docker 빌드 및 실행

```bash
# 1. 기존 컨테이너 정리 (있다면)
docker-compose -f docker-compose.test.yml down -v

# 2. BuildKit 활성화하여 빌드
export DOCKER_BUILDKIT=1
export TMPDIR=/volume1/tmp
export DOCKER_TMPDIR=/volume1/tmp

docker-compose -f docker-compose.test.yml up -d --build

# 3. 빌드 진행 상황 모니터링
docker-compose -f docker-compose.test.yml logs -f web-test

# 4. 빌드 성공 확인
docker-compose -f docker-compose.test.yml ps
# 모든 서비스가 Up (healthy) 상태여야 함
```

### Phase 5: 데이터베이스 초기화

```bash
# 1. DB 연결 확인
docker-compose -f docker-compose.test.yml exec db-test pg_isready -U crawler_user

# 2. 스키마 적용 (새 환경)
docker-compose -f docker-compose.test.yml exec web-test npx prisma db push --force-reset

# 또는 마이그레이션 적용 (기존 환경)
docker-compose -f docker-compose.test.yml exec web-test npx prisma migrate deploy

# 3. 테이블 생성 확인
docker-compose -f docker-compose.test.yml exec db-test \
  psql -U crawler_user -d naver_crawler_test -c "\dt"
```

### Phase 6: 서비스 검증

```bash
# 1. 웹 서비스 상태 확인
curl -I http://localhost:3001/

# 2. API 엔드포인트 확인
curl -s http://localhost:3001/api/status | jq '.'

# 3. 로그 확인 (에러 없는지)
docker-compose -f docker-compose.test.yml logs --tail=100 web-test | grep -i error

# 4. Redis 연결 확인
docker-compose -f docker-compose.test.yml exec redis-test redis-cli ping

# 5. 메모리/CPU 사용량 확인
docker stats --no-stream
```

### Phase 7: 문제 발생 시 디버깅

```bash
# 1. 패키지 누락 에러 시
docker-compose -f docker-compose.test.yml logs web-test | grep "Module not found"
# 발견된 패키지 설치
docker-compose -f docker-compose.test.yml exec web-test npm install <package-name>

# 2. 환경 변수 문제 시
docker-compose -f docker-compose.test.yml exec web-test env | grep NEXTAUTH
# 없으면 down 후 up
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d

# 3. Next.js 캐시 문제 시
docker-compose -f docker-compose.test.yml exec web-test rm -rf .next
docker-compose -f docker-compose.test.yml restart web-test

# 4. Btrfs busy 문제 시
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d --force-recreate --remove-orphans

# 5. DB 마이그레이션 실패 시
# 마이그레이션 대신 db push 사용
docker-compose -f docker-compose.test.yml exec web-test npx prisma db push
```

---

## 배포 체크리스트

### 사전 체크

- [ ] 로컬에서 `npm run build` 성공
- [ ] `npx tsc --noEmit` 타입 체크 통과
- [ ] `npx prisma validate` 스키마 검증 통과
- [ ] package.json과 package-lock.json 동기화 확인
- [ ] 모든 변경사항 커밋 및 푸시

### NAS 환경 체크

- [ ] 루트 파티션 여유 공간 500MB 이상
- [ ] /volume1 여유 공간 5GB 이상
- [ ] 오래된 Docker 이미지/볼륨 정리 완료
- [ ] config.env 파일 준비 완료
- [ ] DATABASE_URL, NEXTAUTH_SECRET 설정 완료

### Dockerfile 체크

- [ ] `# syntax=docker/dockerfile:1.7` 있음
- [ ] `RUN --mount=type=cache` 사용 (pip, npm)
- [ ] .dockerignore 설정 확인

### 빌드 체크

- [ ] DOCKER_BUILDKIT=1 환경 변수 설정
- [ ] TMPDIR=/volume1/tmp 설정
- [ ] `docker-compose up -d --build` 성공
- [ ] 모든 서비스 Up (healthy) 상태

### 데이터베이스 체크

- [ ] DB 연결 확인 (pg_isready)
- [ ] Prisma 스키마 적용 완료
- [ ] 테이블 생성 확인 (\dt)

### 서비스 검증 체크

- [ ] 웹 페이지 200 OK
- [ ] API 엔드포인트 정상 응답
- [ ] Redis 연결 확인 (PING)
- [ ] 로그에 에러 없음
- [ ] 메모리/CPU 사용량 정상

### 성능 검증 체크

- [ ] Redis 캐싱 동작 확인
- [ ] API 응답 속도 비교
- [ ] 메모리 사용량 비교
- [ ] 브라우저 테스트 완료

---

## 트러블슈팅 가이드

### 문제: "No space left on device"

**원인:** 루트 파티션 부족

**해결:**
```bash
# 1. 공간 확인
df -h

# 2. Docker 리소스 정리
docker system prune -a -f
docker volume prune -f

# 3. /root/.cache 정리
rm -rf /root/.cache/*

# 4. 빌드 재시도
docker-compose -f docker-compose.test.yml up -d --build
```

---

### 문제: "Module not found: Can't resolve 'xxx'"

**원인:** package.json에 없는 패키지 사용

**해결:**
```bash
# 1. 컨테이너에서 설치
docker-compose -f docker-compose.test.yml exec web-test npm install <package-name>

# 2. 재시작
docker-compose -f docker-compose.test.yml restart web-test

# 3. 로컬 package.json에도 추가하고 커밋
npm install --save <package-name>
git add package.json package-lock.json
git commit -m "fix: add missing package"
git push
```

---

### 문제: "Btrfs snapshot busy"

**원인:** Synology Btrfs 파일시스템 특성

**해결:**
```bash
# 볼륨 삭제 시도하지 말고 우회
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d --force-recreate --remove-orphans
```

---

### 문제: 환경 변수가 컨테이너에 없음

**원인:** restart는 환경 변수 재로드 안 됨

**해결:**
```bash
# down 후 up (컨테이너 재생성)
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d

# 확인
docker-compose -f docker-compose.test.yml exec web-test env | grep NEXTAUTH
```

---

### 문제: "relation 'xxx' does not exist" (DB)

**원인:** 마이그레이션 순서 문제

**해결:**
```bash
# 마이그레이션 대신 db push 사용
docker-compose -f docker-compose.test.yml exec db-test \
  psql -U crawler_user -d naver_crawler_test -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

docker-compose -f docker-compose.test.yml exec web-test \
  npx prisma db push --force-reset
```

---

### 문제: 코드 변경 후에도 오래된 에러

**원인:** Next.js 빌드 캐시

**해결:**
```bash
# .next 캐시 삭제
docker-compose -f docker-compose.test.yml exec web-test rm -rf .next
docker-compose -f docker-compose.test.yml restart web-test
```

---

## 성능 최적화 팁

### 1. BuildKit 캐시 마운트 활용

```dockerfile
# Dockerfile.dev
# syntax=docker/dockerfile:1.7

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

**효과:**
- 빌드 시간 50% 단축
- 루트 파티션 사용량 감소

---

### 2. .dockerignore 최적화

```.dockerignore
node_modules
.next
.git
*.md
docs/
tests/
.env*
*.log
```

**효과:**
- 빌드 컨텍스트 크기 감소
- 빌드 속도 향상

---

### 3. 다단계 빌드 (프로덕션용)

```dockerfile
# 빌드 스테이지
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 실행 스테이지
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
CMD ["npm", "start"]
```

**효과:**
- 이미지 크기 60% 감소
- 보안 향상

---

## 테스트 환경 세팅 문제 해결

### 8. NextAuth 세션 문제 (로그인 후 리다이렉트 실패)

**문제:**
- 로그인 성공 토스트는 나오지만 랜딩 페이지에 계속 머물러 있음
- 세션 쿠키는 생성되지만 `/api/auth/session`이 `{}`를 반환
- 브라우저가 세션 쿠키를 HTTP 요청에 포함하지 않음

**시도한 해결책들:**

1. **NEXTAUTH_URL 설정** ❌
   ```yaml
   # docker-compose.test.yml
   - NEXTAUTH_URL=http://localhost:3001  # 실패
   - NEXTAUTH_URL=http://175.125.204.97:3001  # 여전히 실패
   ```

2. **쿠키 secure 설정 변경** ❌
   ```typescript
   // lib/auth.ts
   cookies: {
     sessionToken: {
       options: {
         secure: false,  // HTTP 허용
       }
     }
   }
   ```

3. **모든 NextAuth 쿠키 커스터마이징** ❌
   ```typescript
   cookies: {
     sessionToken: { name: 'next-auth.session-token.test' },
     callbackUrl: { name: 'next-auth.callback-url.test' },
     csrfToken: { name: 'next-auth.csrf-token.test' }
   }
   ```
   → csrf-token이 생성되지 않음, 설정 미적용

**근본 원인:**
- **NEXTAUTH_SECRET이 프로덕션과 동일**
- 같은 도메인(175.125.204.97)에서 같은 시크릿을 사용하면 JWT 토큰이 충돌
- 쿠키 커스터마이징보다 시크릿 분리가 핵심

**최종 해결책:** ✅
```bash
# 1. 테스트용 고유 시크릿 생성
openssl rand -base64 32
# → kTJEgsY3AKlgYYoG6oR6ozox1dXtiUj8bvvQidz2dF4=

# 2. docker-compose.test.yml에 적용
environment:
  - NEXTAUTH_URL=http://175.125.204.97:3001
  - NEXTAUTH_SECRET=kTJEgsY3AKlgYYoG6oR6ozox1dXtiUj8bvvQidz2dF4=

# 3. lib/auth.ts에서 cookies 커스터마이징 제거
# NextAuth 기본값 사용 + NEXTAUTH_SECRET만 다르게
```

**왜 한 번에 해결 안 됐나:**
- NextAuth의 쿠키 vs JWT 시크릿 관계를 잘못 이해
- 쿠키 이름이 중요한 것이 아니라 JWT 암호화 키가 중요
- 같은 도메인에서 같은 시크릿 = 세션 충돌
- cookies 커스터마이징은 불필요하고 오히려 복잡도만 증가

**검증:**
```bash
# 프로덕션
docker exec naver-crawler-web printenv | grep NEXTAUTH_SECRET
# → 8G5CsuDMczGzBClS/RWz4LFxfiIgQ00kYRnlBDAWJ08=

# 테스트 (달라야 함!)
docker exec naver-crawler-web-test printenv | grep NEXTAUTH_SECRET
# → kTJEgsY3AKlgYYoG6oR6ozox1dXtiUj8bvvQidz2dF4=
```

---

## 참고 자료

- [Docker BuildKit Documentation](https://docs.docker.com/build/buildkit/)
- [Prisma Migrate vs DB Push](https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Synology Docker Best Practices](https://kb.synology.com/en-global/DSM/tutorial/Docker_best_practices)

---

## 버전 히스토리

- v1.0 (2025-10-22): 초기 문서 작성
  - perf_improve 브랜치 배포 경험 기반
  - 7가지 주요 문제 및 해결책 문서화
  - 올바른 배포 프로세스 정립
