# 보안 가이드

## 중요 보안 사항

### 1. 환경 변수 관리

**절대 Git에 커밋하면 안 되는 파일:**
- `.env`
- `.env.local`
- `config.env` (실제 키가 포함된 경우)
- 모든 비밀번호, API 키, 토큰이 포함된 파일

**Git에 커밋해도 되는 파일:**
- `.env.example` (플레이스홀더만 포함)
- `config.env.example` (플레이스홀더만 포함)

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

- [ ] `.env.local` 파일에 실제 비밀번호/API 키 설정
- [ ] `docker-compose.dev.yml`의 환경 변수 확인
- [ ] PostgreSQL 비밀번호를 기본값에서 변경
- [ ] NEXTAUTH_SECRET을 강력한 값으로 변경
- [ ] INTERNAL_API_SECRET 설정
- [ ] Naver Maps API 키 설정
- [ ] 공공데이터포털 API 키 설정

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

# 2. 환경 변수 파일 생성
cp .env.example .env
cp config.env.example config.env

# 3. .env.local 파일 생성 (실제 비밀 정보)
cat > .env.local << EOF
POSTGRES_PASSWORD=your_strong_password
NAVER_MAPS_CLIENT_ID=your_client_id
NAVER_MAPS_CLIENT_SECRET=your_client_secret
EOF

# 4. Docker Compose 실행
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

- [NAVER_API_SETUP.md](NAVER_API_SETUP.md) - Naver API 설정 가이드
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 배포 가이드
- [.env.example](.env.example) - 환경 변수 예시
