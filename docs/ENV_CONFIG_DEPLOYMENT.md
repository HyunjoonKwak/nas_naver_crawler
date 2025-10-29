# 환경 변수 관리 시스템 배포 가이드

## 📋 개요

사용자 친화적인 환경 변수 관리 시스템이 추가되었습니다.

### 주요 기능
- ✅ 웹 UI에서 환경 변수 설정 (사용자별)
- ✅ 11개 미리 정의된 템플릿 (Slack, Discord, SMTP 등)
- ✅ 단계별 입력 가이드 (마크다운)
- ✅ 실시간 입력 검증 (정규식 기반)
- ✅ 연결 테스트 기능 (저장 전 검증)
- ✅ 시스템 환경 변수 조회 (관리자 전용)
- ✅ SSH 편집 가이드 제공

---

## 🚀 NAS 배포 단계

### 1. 패키지 설치

```bash
# NAS SSH 접속
ssh root@nas-ip

# 프로젝트 디렉토리로 이동
cd /volume1/code_work/nas_naver_crawler

# 필요한 패키지 설치
docker exec -it naver-crawler-web npm install react-markdown remark-gfm nodemailer https-proxy-agent
```

### 2. 데이터베이스 마이그레이션

```bash
# Prisma 마이그레이션 실행
docker exec -it naver-crawler-web npx prisma migrate dev --name add_user_env_config

# 또는 db push 사용 (더 간단)
docker exec -it naver-crawler-web npx prisma db push
```

### 3. 컨테이너 재시작

```bash
# 웹 컨테이너 재시작
docker-compose -f docker-compose.dev.yml restart web

# 로그 확인
docker-compose -f docker-compose.dev.yml logs -f web
```

### 4. 동작 확인

웹 브라우저에서 접속:
- 사용자 환경 변수: `http://nas-ip:3000/settings/my-env`
- 시스템 환경 변수: `http://nas-ip:3000/settings/system-env` (관리자만)

---

## 📁 생성된 파일 목록

### 데이터베이스
- `prisma/schema.prisma` - SystemEnvConfig, UserEnvConfig 모델 추가

### 라이브러리
- `lib/env-templates.ts` - 11개 템플릿 시스템
- `lib/user-env-config.ts` - 헬퍼 함수

### API
- `app/api/user-env-config/route.ts` - CRUD API
- `app/api/user-env-config/[id]/reveal/route.ts` - 값 조회
- `app/api/user-env-config/test/route.ts` - 연결 테스트
- `app/api/system-env-config/route.ts` - 시스템 설정 조회

### 웹 UI
- `app/settings/my-env/page.tsx` - 사용자 환경 변수 관리
- `app/settings/system-env/page.tsx` - 시스템 설정 조회

### 기타
- `components/Navigation.tsx` - 메뉴 추가

---

## 🎯 사용 방법

### 사용자: 환경 변수 추가

1. **메뉴 접속**
   - 상단 메뉴 → 설정 → 내 환경 변수

2. **템플릿 선택**
   - "새 설정 추가" 버튼 클릭
   - 원하는 템플릿 선택 (예: Slack 웹훅 URL)

3. **가이드 확인**
   - 상세한 발급 방법 가이드 읽기
   - 공식 문서 링크 확인

4. **값 입력**
   - 입력란에 값 입력
   - 실시간 형식 검증 확인

5. **연결 테스트** (선택)
   - "연결 테스트" 버튼 클릭
   - 실제 메시지 발송 확인

6. **저장**
   - "저장" 버튼 클릭

### 관리자: 시스템 설정 확인

1. **메뉴 접속**
   - 상단 메뉴 → 설정 → 시스템 설정

2. **설정 조회**
   - 보안 설정: 조회 불가 (*******)
   - API 키: 마스킹 (************1234)
   - 크롤러 설정: 전체 표시

3. **편집 방법 확인**
   - "편집 방법 보기" 클릭
   - SSH 명령어 복사하여 실행

---

## 🔧 추가 설정 (선택사항)

### 암호화 키 설정

더 강력한 보안을 위해 암호화 키를 변경하세요:

```bash
# config.env 편집
vi /volume1/code_work/nas_naver_crawler/config.env

# 아래 라인 추가 (32자 이상 랜덤 문자열)
ENCRYPTION_KEY=your-super-secret-32-character-key-here-12345!

# 재시작
docker-compose -f docker-compose.dev.yml restart web
```

### config.env 키 이름 변경 (선택)

코드에서 `PUBLIC_DATA_SERVICE_KEY`를 사용하므로 통일:

```bash
# config.env 편집
vi /volume1/code_work/nas_naver_crawler/config.env

# 변경 전
MOLIT_SERVICE_KEY=your_service_key_here

# 변경 후
PUBLIC_DATA_SERVICE_KEY=your_service_key_here
```

---

## 📊 사용 가능한 템플릿

### 웹훅
1. **SLACK_WEBHOOK_URL** - Slack 웹훅
2. **DISCORD_WEBHOOK_URL** - Discord 웹훅

### 이메일 알림
3. **NOTIFICATION_EMAIL** - 알림 받을 이메일
4. **SMTP_SERVER** - SMTP 서버 주소
5. **SMTP_PORT** - SMTP 포트
6. **SMTP_USERNAME** - SMTP 사용자명
7. **SMTP_PASSWORD** - SMTP 비밀번호 (앱 비밀번호)

### 네트워크/프록시
8. **USE_PROXY** - 프록시 사용 여부
9. **PROXY_URL** - 프록시 서버 URL
10. **PROXY_USERNAME** - 프록시 사용자명
11. **PROXY_PASSWORD** - 프록시 비밀번호

---

## 🧪 테스트 기능

### 지원하는 테스트

| 템플릿 | 테스트 내용 |
|--------|------------|
| Slack 웹훅 | 실제 Slack 채널에 테스트 메시지 발송 |
| Discord 웹훅 | 실제 Discord 채널에 테스트 메시지 발송 |
| SMTP 설정 | 서버 연결 검증 (nodemailer verify) |
| 프록시 | httpbin.org를 통한 연결 테스트 |

### 테스트 실행

1. 값 입력 후 "연결 테스트" 버튼 클릭
2. 성공/실패 메시지 확인
3. 성공 시 저장 진행

---

## ⚠️ 주의사항

### 보안
- ✅ 모든 값은 AES-256-GCM으로 암호화되어 저장
- ✅ 민감한 정보는 마스킹 처리
- ✅ 사용자는 자신의 설정만 조회 가능
- ⚠️ ENCRYPTION_KEY는 절대 외부 노출 금지

### 시스템 환경 변수
- ⚠️ config.env는 웹 UI에서 편집 불가
- ⚠️ 변경 시 반드시 컨테이너 재시작 필요
- ⚠️ DATABASE_URL, NEXTAUTH_SECRET 등 변경 시 주의

### Gmail SMTP
- ⚠️ 일반 비밀번호가 아닌 **앱 비밀번호** 필수
- ✅ Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호

---

## 🐛 문제 해결

### 마이그레이션 실패

```bash
# Prisma 클라이언트 재생성
docker exec -it naver-crawler-web npx prisma generate

# 강제 db push
docker exec -it naver-crawler-web npx prisma db push --force-reset
```

### 패키지 설치 오류

```bash
# node_modules 재설치
docker exec -it naver-crawler-web rm -rf node_modules
docker exec -it naver-crawler-web npm install
```

### 웹 UI 접속 안 됨

```bash
# 로그 확인
docker-compose -f docker-compose.dev.yml logs web | tail -100

# 컨테이너 재시작
docker-compose -f docker-compose.dev.yml restart web
```

---

## 📚 참고 자료

### 관련 문서
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 전체 문서
- [GETTING_STARTED.md](./GETTING_STARTED.md) - 시작 가이드

### 외부 링크
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Discord Webhooks](https://support.discord.com/hc/en-us/articles/228383668)
- [Gmail 앱 비밀번호](https://support.google.com/accounts/answer/185833)
- [공공데이터포털](https://www.data.go.kr/)

---

## ✅ 배포 체크리스트

- [ ] 패키지 설치 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 컨테이너 재시작 완료
- [ ] 웹 UI 접속 확인
- [ ] 템플릿 선택 동작 확인
- [ ] 입력 검증 동작 확인
- [ ] 연결 테스트 동작 확인 (Slack/Discord)
- [ ] 저장/조회/삭제 기능 확인
- [ ] 시스템 설정 페이지 접근 (관리자)
- [ ] ENCRYPTION_KEY 설정 (선택)

---

**작성일**: 2025-10-29
**버전**: 1.0.0
