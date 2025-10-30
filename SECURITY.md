# 보안 가이드

## 중요 보안 사항

### 1. 환경 변수 관리 ⭐ 중요

**이 프로젝트는 `config.env` 단일 파일로 환경 변수를 관리합니다.**

`.env` 파일은 `config.env`를 가리키는 **심볼릭 링크**입니다.

**절대 Git에 커밋하면 안 되는 파일:**
- `config.env` - 실제 API 키, 비밀번호 포함 (Git 추적 제외됨)
- `.env` - config.env의 심볼릭 링크 (Git 추적 제외됨)
- 모든 비밀번호, API 키, 토큰이 포함된 파일

**Git에 커밋해도 되는 파일:**
- `.env.example` - 플레이스홀더만 포함
- `config.env.example` - 플레이스홀더만 포함 (config.env 템플릿)

**올바른 설정 방법:**
```bash
# 1. 템플릿 복사
cp config.env.example config.env

# 2. 실제 API 키 및 비밀번호 입력
vi config.env

# 3. 심볼릭 링크 확인 (자동 생성되어 있음)
ls -lah .env
# lrwxr-xr-x  .env -> config.env
```

**상세 가이드:** [docs/ENV_SETUP.md](docs/ENV_SETUP.md)

### 2. 비밀번호 정책

#### PostgreSQL 비밀번호
- **기본값 사용 금지**: `crawler_pass_2025`는 개발용입니다
- **프로덕션**: 반드시 강력한 랜덤 비밀번호 사용
- **생성 방법**:
  ```bash
  openssl rand -base64 32
  ```

#### NextAuth Secret
- **최소 32자 이상** 랜덤 문자열 필수
- **생성 방법**:
  ```bash
  openssl rand -base64 32
  ```

### 3. NAS 배포 시 보안 체크리스트

- [ ] `config.env` 파일 생성 (`config.env.example` 복사)
- [ ] PostgreSQL 비밀번호를 기본값에서 변경
- [ ] NEXTAUTH_SECRET을 강력한 값으로 변경 (`openssl rand -base64 32`)
- [ ] INTERNAL_API_SECRET 설정 (`openssl rand -base64 32`)
- [ ] Naver Maps API 키 설정 (CLIENT_ID, CLIENT_SECRET)
- [ ] 공공데이터포털 API 키 설정 (PUBLIC_DATA_SERVICE_KEY)
- [ ] `config.env`가 Git에 추적되지 않는지 확인 (`git status`)

### 4. 이미 노출된 비밀 정보 처리

만약 비밀번호나 API 키가 Git에 커밋된 경우:

1. **즉시 비밀번호/키 변경**
   - DB 비밀번호 변경
   - API 키 재발급

2. **Git 히스토리에서 제거** (선택사항, 복잡함)
   ```bash
   # BFG Repo-Cleaner 사용
   java -jar bfg.jar --replace-text passwords.txt .git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push origin --force --all
   ```

3. **팀원들에게 알림**
   - 새로운 비밀번호/키 공유
   - 저장소 재클론 필요 (force push 후)

### 5. API 키 관리

#### Naver Maps API
- 발급 위치: https://www.ncloud.com/
- 사용량 모니터링 필요
- IP 제한 권장 (가능한 경우)

#### 공공데이터포털 API
- 발급 위치: https://www.data.go.kr/
- 일일 트래픽 제한 있음
- Decoding 방식 사용

### 6. 로컬 개발 환경 설정

```bash
# 1. 저장소 클론
git clone <repo_url>
cd nas_naver_crawler

# 2. config.env 파일 생성
cp config.env.example config.env

# 3. 실제 비밀 정보 입력
vi config.env
# 필수 값 입력:
# - POSTGRES_PASSWORD
# - NEXTAUTH_SECRET
# - INTERNAL_API_SECRET
# - NAVER_MAPS_CLIENT_ID
# - NAVER_MAPS_CLIENT_SECRET
# - PUBLIC_DATA_SERVICE_KEY

# 4. 심볼릭 링크 확인
ls -lah .env
# .env -> config.env (이미 생성되어 있음)

# 5. Docker Compose 실행
docker-compose -f docker-compose.dev.yml up -d
```

### 7. 보안 점검 명령

정기적으로 다음 명령을 실행하여 보안 점검:

```bash
# Git에 추적되는 민감한 파일 확인
git ls-files | grep -E "\.(env|key|pem|secret)$"

# 하드코딩된 비밀번호 검색
git grep -i "password.*=.*['\"]" | grep -v "example\|placeholder"

# API 키 패턴 검색
git grep -E "['\"][A-Za-z0-9]{32,}['\"]"
```

### 8. 비상 연락

보안 문제 발견 시:
- Issue 생성 (민감한 정보는 제외)
- 관리자에게 직접 연락
- 노출된 키는 즉시 무효화

## 참고 문서

- [docs/ENV_SETUP.md](docs/ENV_SETUP.md) - 환경 변수 관리 상세 가이드 ⭐
- [docs/NAVER_API_SETUP.md](docs/NAVER_API_SETUP.md) - Naver API 설정 가이드
- [docs/NAS_SETUP.md](docs/NAS_SETUP.md) - NAS 배포 가이드
- [config.env.example](config.env.example) - 환경 변수 템플릿
