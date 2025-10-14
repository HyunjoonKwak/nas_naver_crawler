# NAS 배포 명령어 리스트 (개발 모드)

Phase 1 (Discord 알림) + Phase 2 (스케줄 크롤링) 배포를 위한 명령어 목록입니다.

## 1. NAS에 SSH 접속

```bash
ssh your-nas-user@your-nas-ip
```

## 2. 프로젝트 디렉토리로 이동

```bash
cd /path/to/nas_naver_crawler
```

## 3. Git 변경사항 가져오기

```bash
git pull origin main
```

## 4. 의존성 패키지 설치

```bash
npm install
```

이 명령어로 다음 패키지가 설치됩니다:
- `node-cron` (스케줄 실행)
- `cronstrue` (cron 표현식 한글 변환)
- `@types/node-cron` (TypeScript 타입)

## 5. Prisma 스키마 적용

```bash
npx prisma generate
npx prisma db push
```

이 명령어로 다음 테이블이 생성됩니다:
- `Alert` (알림 설정)
- `AlertLog` (알림 발송 기록)
- `Schedule` (스케줄 설정)
- `ScheduleLog` (스케줄 실행 기록)

## 6. 개발 서버 재시작

현재 실행 중인 Next.js 개발 서버를 중지하고 다시 시작합니다.

### 방법 A: 터미널에서 직접 실행 중인 경우

```bash
# Ctrl+C로 기존 서버 중지 후
npm run dev
```

### 방법 B: PM2로 관리하는 경우

```bash
pm2 restart property-manager-dev
```

### 방법 C: 새로 PM2에 등록하는 경우

```bash
pm2 start npm --name "property-manager-dev" -- run dev
pm2 save
```

## 7. 배포 확인

브라우저에서 다음 페이지들이 정상 작동하는지 확인:

- 알림 관리: `http://your-nas-ip:3000/alerts`
- 스케줄 관리: `http://your-nas-ip:3000/scheduler`

## 8. 스케줄 자동 로드 (선택사항)

서버 재시작 시 활성화된 스케줄을 자동으로 로드하려면 `package.json`의 `dev` 스크립트를 수정하거나, 서버 시작 후 다음 API를 호출:

```bash
curl http://localhost:3000/api/schedules/init
```

## 완료!

이제 다음 기능을 사용할 수 있습니다:

1. **Discord 알림**
   - 관심 단지의 매물 변동 알림
   - 신규/삭제/가격변동 감지
   - 조건별 필터링 (가격, 면적, 거래유형)

2. **스케줄 크롤링**
   - 원하는 시간에 자동 크롤링
   - Cron 표현식 또는 프리셋 사용
   - 실행 기록 확인

---

## 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# 3000 포트 사용 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### Prisma 관련 오류 발생 시

```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 연결 확인
npx prisma db push
```

### 스케줄이 자동 로드되지 않는 경우

서버 시작 후 수동으로 초기화:

```bash
curl http://localhost:3000/api/schedules/init
```
