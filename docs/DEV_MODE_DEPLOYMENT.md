# 개발 모드 배포 가이드

## 개요

NAS 성능을 고려하여 **개발 모드 (Hot Reload)**로 전환했습니다.
- ✅ 빌드 시간 없이 빠른 배포
- ✅ 코드 변경 시 자동 반영
- ✅ `git pull` 후 바로 적용

## 배포 방법

### 최초 배포 (이미지 빌드 필요, 한 번만)

```bash
cd /volume1/docker/naver-crawler

# 1. 최신 코드 가져오기
git pull origin main

# 2. 개발 모드 이미지 빌드
docker-compose up -d --build

# 3. 로그 확인
docker-compose logs -f web
```

**빌드 완료 확인:**
```
✓ Ready in 3s
○ Local:        http://localhost:3000
```

### 이후 배포 (빌드 없이 빠른 배포)

```bash
cd /volume1/docker/naver-crawler

# 1. 최신 코드 가져오기
git pull origin main

# 2. Prisma 스키마 변경 시에만 (DB 변경 없으면 스킵)
docker-compose exec web npx prisma db push
docker-compose exec web npx prisma generate

# 3. 컨테이너 재시작 (Hot Reload가 자동으로 감지)
docker-compose restart web

# 또는 그냥 기다리면 자동으로 변경 감지 (Hot Reload)
```

**즉시 반영됨!** (3-5초 내)

## Hot Reload 작동 방식

코드 변경 → 자동 감지 → 재컴파일 → 브라우저 자동 새로고침

**자동 반영되는 파일:**
- `app/**/*.tsx` - 페이지 파일
- `components/**/*.tsx` - 컴포넌트
- `lib/**/*.ts` - 유틸리티
- CSS/Tailwind 변경

**재시작 필요한 경우:**
- `next.config.js` 변경
- `package.json` 변경 (의존성 추가)
- `prisma/schema.prisma` 변경 (DB 스키마)
- 환경 변수 변경

## 프로덕션 모드로 전환 (선택사항)

성능이 필요하거나 최종 배포 시:

### 1. docker-compose.yml 수정

```yaml
web:
  build:
    context: .
    dockerfile: Dockerfile  # Dockerfile.dev → Dockerfile
```

### 2. 재빌드

```bash
docker-compose up -d --build
```

## 비교

| 항목 | 개발 모드 | 프로덕션 모드 |
|------|----------|-------------|
| 빌드 시간 | 최초 1회만 (3-5분) | 매번 (5-10분) |
| Hot Reload | ✅ 자동 | ❌ 재빌드 필요 |
| 성능 | 보통 | 최적화됨 |
| 배포 속도 | ⚡ 즉시 | 🐢 느림 |
| 용도 | 개발/테스트 | 운영 |

## 현재 설정

**현재 모드:** 개발 모드 (Hot Reload)
**Dockerfile:** `Dockerfile.dev`
**명령어:** `npm run dev`

## 문제 해결

### Hot Reload가 작동하지 않을 때

```bash
# 컨테이너 재시작
docker-compose restart web

# 로그 확인
docker-compose logs -f web
```

### 변경사항이 반영되지 않을 때

```bash
# 컨테이너 완전 재시작
docker-compose down
docker-compose up -d

# 또는 캐시 삭제 후 재빌드
docker-compose build --no-cache web
docker-compose up -d
```

### Prisma 변경 시

```bash
# 스키마 변경 후
docker-compose exec web npx prisma db push
docker-compose exec web npx prisma generate

# 컨테이너 재시작
docker-compose restart web
```

## 팁

1. **VSCode로 NAS 접속:** SFTP 플러그인 사용하면 로컬에서 편집 → 자동 업로드 → Hot Reload
2. **로그 실시간 확인:** `docker-compose logs -f web`
3. **빠른 테스트:** 코드 수정 → 저장 → 3초 대기 → 브라우저 새로고침

## 참고

- 개발 모드는 메모리를 더 사용합니다 (약 1.5GB)
- 장기 운영 시 프로덕션 모드 권장
- 현재 설정은 개발/테스트 환경에 최적화
