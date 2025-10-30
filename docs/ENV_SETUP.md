# 환경 변수 관리 가이드

## 개요

이 프로젝트는 **`config.env` 단일 파일**로 모든 환경 변수를 관리합니다.

---

## 파일 구조

```
프로젝트 루트/
├── .env                    (심볼릭 링크 → config.env, Git 무시)
├── .env.example            (예시 파일, Git 추적)
├── config.env              (실제 환경 변수, Git 무시) ⭐
└── config.env.example      (config.env 템플릿, Git 추적)
```

**중요:** `.env`는 `config.env`를 가리키는 심볼릭 링크입니다.

---

## 환경 변수 로딩 방식

### 1. Next.js 애플리케이션 (로컬 개발)

Next.js는 `.env` 파일을 자동으로 로드하며, 실제로는 심볼릭 링크를 통해 `config.env`를 읽습니다.

```bash
npm run dev  # .env (→ config.env) 자동 로드
```

### 2. Docker Compose (NAS 배포)

`docker-compose.dev.yml`에서 `config.env`를 명시적으로 로드합니다:

```yaml
services:
  web:
    env_file:
      - config.env  # ← 명시적 로드
```

### 3. Python 크롤러

`python-dotenv` 라이브러리로 `.env` 파일을 로드합니다:

```python
from dotenv import load_dotenv
load_dotenv()  # .env (→ config.env) 로드
```

---

## 초기 설정 방법

### 1. 로컬 개발 환경

```bash
# 1. 템플릿 복사
cp config.env.example config.env

# 2. 실제 API 키 및 비밀번호 입력
vi config.env

# 3. 심볼릭 링크 확인 (자동 생성되어 있음)
ls -lah .env
# lrwxr-xr-x  .env -> config.env
```

### 2. NAS 배포 환경

```bash
# NAS에서 작업
cd /volume1/code_work/nas_naver_crawler

# 1. 템플릿 복사
cp config.env.example config.env

# 2. 실제 값 입력
vi config.env

# 3. Docker Compose로 배포
./docker-compose-v2 -f docker-compose.dev.yml up -d
```

---

## 필수 환경 변수

### 데이터베이스

```bash
DATABASE_URL="postgresql://crawler_user:YOUR_PASSWORD@db:5432/naver_crawler?schema=public"
POSTGRES_PASSWORD="YOUR_PASSWORD"
```

### NextAuth (인증)

```bash
# 생성: openssl rand -base64 32
NEXTAUTH_SECRET="강력한_랜덤_문자열_최소_32자"
NEXTAUTH_URL="http://localhost:3000"  # 배포 환경에 맞게 변경
```

### 내부 API

```bash
# 생성: openssl rand -base64 32
INTERNAL_API_SECRET="강력한_랜덤_문자열"
```

### Naver Maps API (지오코딩)

```bash
NAVER_MAPS_CLIENT_ID="your_client_id"
NAVER_MAPS_CLIENT_SECRET="your_client_secret"
```

발급: [docs/NAVER_API_SETUP.md](./NAVER_API_SETUP.md) 참조

### 공공데이터 API (실거래가)

```bash
PUBLIC_DATA_SERVICE_KEY="your_service_key"
```

발급: [docs/PUBLIC-DATA-API-SETUP.md](./PUBLIC-DATA-API-SETUP.md) 참조

---

## 보안 주의사항

### 절대 하지 말아야 할 것

❌ `config.env` 파일을 Git에 커밋
❌ API 키를 코드에 하드코딩
❌ 예시 파일(`config.env.example`)에 실제 키 입력
❌ 주석에도 실제 API 키 작성

### 반드시 해야 할 것

✅ `config.env`는 로컬에만 보관
✅ 강력한 비밀번호 사용 (`openssl rand -base64 32`)
✅ API 키는 환경별로 분리
✅ `.gitignore`에 `config.env` 포함 확인

---

## 문제 해결

### Q1. 환경 변수가 로드되지 않아요

**Docker 환경:**
```bash
# 컨테이너 내부 환경 변수 확인
docker exec naver-crawler-web env | grep NAVER

# 없으면 config.env 확인
cat config.env | grep NAVER
```

**로컬 개발:**
```bash
# 심볼릭 링크 확인
ls -lah .env

# .env가 심볼릭 링크가 아니면:
rm .env
ln -s config.env .env
```

### Q2. Docker Compose 실행 시 변수가 없다고 나와요

**원인:** `environment:` 섹션에서 정의하지 않은 변수를 참조

**해결:**
```yaml
# docker-compose.dev.yml
services:
  web:
    env_file:
      - config.env  # ← config.env에 변수 정의
    environment:
      - DATABASE_URL=${DATABASE_URL}  # ← 이렇게 참조하지 말 것!
```

**올바른 방법:**
```yaml
services:
  web:
    env_file:
      - config.env  # ← config.env의 모든 변수 자동 로드
```

### Q3. Next.js에서 환경 변수에 접근할 수 없어요

**클라이언트 컴포넌트에서:**
```typescript
// ❌ 클라이언트에서 서버 환경 변수 접근 불가
const apiKey = process.env.NAVER_MAPS_CLIENT_ID;  // undefined

// ✅ 서버 컴포넌트 또는 API Route에서만 접근 가능
// app/api/geocode/route.ts
export async function GET() {
  const apiKey = process.env.NAVER_MAPS_CLIENT_ID;  // ✅
}
```

**클라이언트에 노출하려면:** (권장하지 않음)
```bash
# config.env
NEXT_PUBLIC_MAP_URL="https://map.naver.com"  # NEXT_PUBLIC_ 접두사
```

---

## 환경 변수 검증

프로젝트는 시작 시 자동으로 환경 변수를 검증합니다 ([lib/env.ts](../lib/env.ts)):

```typescript
import { validateEnv } from '@/lib/env';

// 필수 환경 변수 검증
const env = validateEnv();  // 없으면 에러 발생
```

**검증 항목:**
- `DATABASE_URL` (URL 형식)
- `NEXTAUTH_SECRET` (최소 32자)
- `INTERNAL_API_SECRET` (최소 32자)

---

## 추가 참고 자료

- [Naver Maps API 설정](./NAVER_API_SETUP.md)
- [공공데이터 API 설정](./PUBLIC-DATA-API-SETUP.md)
- [NAS 배포 가이드](./NAS_SETUP.md)
- [보안 가이드](../SECURITY.md)

---

**마지막 업데이트:** 2025-10-30
**관련 이슈:** 환경 변수 관리 단일화 (config.env)
