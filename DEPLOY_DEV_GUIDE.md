# 🚀 NAS 개발 모드 배포 가이드

> **현재 상태**: 로컬 개발 완료, NAS 개발 환경 배포 준비

---

## 📋 배포 전 체크리스트

### ✅ 완료된 작업
- [x] Phase 1: Discord 알림 시스템 구현
- [x] Phase 2: 스케줄 크롤링 시스템 구현
- [x] package.json 업데이트 (node-cron, cronstrue 추가)

### 🔍 배포 전 확인사항
- [ ] NAS DB 연결 정보 확인
- [ ] Discord 웹훅 URL 준비
- [ ] NAS에 SSH 접속 가능 확인
- [ ] Git 저장소 최신 상태 확인

---

## 🔄 1단계: Git으로 코드 동기화

### 방법 A: Git Push & Pull (권장)

#### 로컬에서 (현재 Mac):
```bash
# 현재 변경사항 확인
git status

# 새로운 파일 추가
git add .

# 커밋
git commit -m "feat: Phase 1 & 2 완료 - 알림 시스템 및 스케줄 크롤링 구현

- Discord 웹훅 알림 시스템 추가
- 매물 변경 추적 (신규/삭제/가격변동)
- node-cron 기반 스케줄 크롤링
- Cron 프리셋 및 관리 UI
- 실행 히스토리 및 로그"

# GitHub에 푸시
git push origin main
```

#### NAS에서:
```bash
# NAS SSH 접속
ssh user@nas-ip

# 프로젝트 디렉토리로 이동
cd /path/to/nas_naver_crawler

# 최신 코드 가져오기
git pull origin main
```

---

## 📦 2단계: 패키지 설치

### NAS에서 실행:
```bash
# 새로운 패키지 설치
npm install

# 설치 확인
npm list node-cron cronstrue

# 예상 출력:
# ├── node-cron@3.0.3
# └── cronstrue@2.50.0
```

### 설치 중 오류 발생 시:
```bash
# package-lock.json 삭제 후 재설치
rm package-lock.json
npm install

# 또는 강제 설치
npm install --force
```

---

## 🗄️ 3단계: 데이터베이스 확인

### DB 연결 확인:
```bash
# .env 파일 확인
cat .env

# DATABASE_URL이 올바른지 확인
# DATABASE_URL="postgresql://user:password@localhost:5432/naver_crawler"
```

### Prisma 스키마 적용 (이미 되어있을 수 있음):
```bash
# 스키마가 최신인지 확인
npx prisma generate

# DB 상태 확인 (마이그레이션 필요 없음 - 이미 완료됨)
npx prisma db pull
```

---

## 🚀 4단계: 개발 서버 실행

### 기존 개발 서버 종료:
```bash
# 실행 중인 Next.js 프로세스 찾기
ps aux | grep "next dev"

# PID 확인 후 종료
kill -9 <PID>

# 또는 한번에
pkill -f "next dev"
```

### 새로운 개발 서버 시작:
```bash
# 개발 모드로 시작
npm run dev

# 백그라운드 실행 (선택)
nohup npm run dev > logs/dev.log 2>&1 &

# 로그 확인
tail -f logs/dev.log
```

### 서버 실행 확인:
```bash
# 로그에서 확인할 내용:
# ✓ Ready in Xs
# ○ Local:    http://localhost:3000
# 📅 Loading all active schedules...
# ✅ Loaded X active schedule(s)
```

---

## 🧪 5단계: 기능 테스트

### 1. 웹 브라우저 접속
```
http://nas-ip:3000
```

### 2. 알림 시스템 테스트

#### Discord 웹훅 준비:
1. Discord 서버 생성 (또는 기존 서버 사용)
2. 채널 설정 → 연동 → 웹후크
3. 웹후크 URL 복사

#### 알림 생성 및 테스트:
```bash
# 1. 브라우저에서 http://nas-ip:3000/alerts 접속
# 2. "새 알림 만들기" 클릭
# 3. 정보 입력:
#    - 이름: 테스트 알림
#    - 단지: 선호 단지 선택
#    - 웹훅 URL: Discord 웹훅 URL 붙여넣기
# 4. "테스트 알림 보내기" 클릭
# 5. Discord에서 테스트 메시지 확인
```

#### 실제 크롤링 테스트:
```bash
# 1. 홈페이지에서 크롤링 1회 실행 (기존 데이터)
# 2. 알림 없음 (첫 크롤링)
# 3. 크롤링 2회 실행 (비교 대상 생김)
# 4. Discord에서 변경사항 알림 확인
```

### 3. 스케줄 크롤링 테스트

#### 스케줄 생성:
```bash
# 1. 브라우저에서 http://nas-ip:3000/scheduler 접속
# 2. "새 스케줄 만들기" 클릭
# 3. 정보 입력:
#    - 이름: 테스트 스케줄
#    - 단지: 선호 단지 선택
#    - 주기: "30분마다" 선택 (테스트용)
# 4. "만들기" 클릭
```

#### 즉시 실행 테스트:
```bash
# 1. 스케줄 카드에서 "▶️ 즉시 실행" 클릭
# 2. 확인 대화상자에서 "확인"
# 3. 잠시 후 실행 로그 확인
# 4. Discord에서 알림 확인
```

#### 자동 실행 확인:
```bash
# 로그에서 확인
tail -f logs/dev.log | grep "Executing scheduled crawl"

# 30분 후 자동 실행 확인
# 로그 출력:
# 🚀 Executing scheduled crawl: xxx
# ✅ Scheduled crawl completed: xxx
```

---

## 📊 6단계: 로그 모니터링

### 실시간 로그 확인:
```bash
# 개발 서버 로그
tail -f logs/dev.log

# 크롤링 로그
tail -f logs/crawler.log

# 알림 관련 로그 필터링
tail -f logs/dev.log | grep -E "(Alert|Discord|Notification)"

# 스케줄 관련 로그 필터링
tail -f logs/dev.log | grep -E "(Schedule|Cron)"
```

### 로그에서 확인할 중요 메시지:
```
✅ 정상 작동:
- "✅ Loaded X active schedule(s)"
- "🚀 Executing scheduled crawl"
- "✅ Sent X notification(s)"
- "✅ Schedule registered"

❌ 문제 발생:
- "Failed to register schedule"
- "Failed to send Discord notification"
- "Database connection error"
- "ECONNREFUSED"
```

---

## 🔧 7단계: 문제 해결

### 문제 1: 패키지 설치 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 문제 2: DB 연결 실패
```bash
# PostgreSQL 실행 확인
docker ps | grep postgres

# DB 재시작 (docker-compose 사용 시)
docker-compose restart postgres

# .env 파일 확인
cat .env | grep DATABASE_URL
```

### 문제 3: 스케줄이 실행 안 됨
```bash
# 서버 로그 확인
tail -f logs/dev.log | grep Schedule

# 스케줄 초기화 API 수동 호출
curl http://localhost:3000/api/schedules/init

# 스케줄 활성화 상태 확인
curl http://localhost:3000/api/schedules
```

### 문제 4: Discord 알림 안 옴
```bash
# 웹훅 URL 테스트
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "테스트 메시지"}'

# 알림 테스트 API 호출
curl -X POST http://localhost:3000/api/alerts/test \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "YOUR_WEBHOOK_URL",
    "testType": "summary"
  }'
```

### 문제 5: 포트 충돌
```bash
# 3000 포트 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 다른 포트로 실행
PORT=3001 npm run dev
```

---

## 📱 8단계: 기능별 테스트 체크리스트

### ✅ 알림 시스템
- [ ] Discord 웹훅 테스트 전송 성공
- [ ] 알림 생성/수정/삭제 작동
- [ ] 활성화/비활성화 토글 작동
- [ ] 크롤링 후 신규 매물 알림 수신
- [ ] 크롤링 후 삭제 매물 알림 수신
- [ ] 크롤링 후 가격 변동 알림 수신
- [ ] 알림 로그 정상 저장

### ✅ 스케줄 크롤링
- [ ] 스케줄 생성/수정/삭제 작동
- [ ] 활성화/비활성화 토글 작동
- [ ] 즉시 실행 버튼 작동
- [ ] Cron 프리셋 선택 작동
- [ ] 예약 시간에 자동 실행
- [ ] 실행 로그 정상 저장
- [ ] 서버 재시작 후 스케줄 자동 로드

### ✅ 통합 테스트
- [ ] 스케줄 자동 실행 → 알림 발송 확인
- [ ] 여러 스케줄 동시 작동 확인
- [ ] 서버 재시작 후 모든 기능 정상 작동

---

## 🎯 9단계: 실제 사용 설정

### 추천 스케줄 설정:
```
1. 매일 아침 크롤링
   - 이름: 매일 오전 크롤링
   - 시간: 0 9 * * * (오전 9시)
   - 단지: 모든 선호 단지

2. 매일 저녁 크롤링
   - 이름: 매일 오후 크롤링
   - 시간: 0 18 * * * (오후 6시)
   - 단지: 모든 선호 단지
```

### 추천 알림 설정:
```
1. 전체 변경사항 알림
   - 이름: 전체 알림
   - 단지: 모든 선호 단지
   - 조건: 제한 없음

2. 저가 매물 알림
   - 이름: 저가 전세 알림
   - 단지: 핵심 단지만
   - 거래유형: 전세
   - 최대가격: 50000만 (5억)
```

---

## 📝 10단계: 모니터링 설정

### 자동 로그 정리:
```bash
# cron으로 로그 정리 (선택사항)
crontab -e

# 매일 자정에 30일 이상 된 로그 삭제
0 0 * * * find /path/to/nas_naver_crawler/logs -name "*.log" -mtime +30 -delete
```

### 주기적 헬스체크:
```bash
# 스케줄 상태 확인 스크립트 작성
cat > check_scheduler.sh << 'EOF'
#!/bin/bash
RESPONSE=$(curl -s http://localhost:3000/api/schedules)
COUNT=$(echo $RESPONSE | grep -o '"id"' | wc -l)
echo "$(date): Active schedules: $COUNT"
EOF

chmod +x check_scheduler.sh

# cron으로 매시간 실행
0 * * * * /path/to/check_scheduler.sh >> /path/to/logs/health.log
```

---

## 🎉 완료 확인

모든 단계가 완료되면 다음 상태여야 합니다:

```
✅ NAS 개발 서버 실행 중 (http://nas-ip:3000)
✅ 알림 시스템 정상 작동
✅ Discord 웹훅 알림 수신
✅ 스케줄 크롤링 자동 실행
✅ 실행 로그 정상 기록
✅ 서버 재시작 후에도 정상 작동
```

---

## 🆘 긴급 대응

### 서버 다운 시:
```bash
# 1. 서버 상태 확인
ps aux | grep "next dev"

# 2. 로그 확인
tail -100 logs/dev.log

# 3. 서버 재시작
pkill -f "next dev"
nohup npm run dev > logs/dev.log 2>&1 &
```

### 데이터베이스 문제 시:
```bash
# 1. DB 연결 확인
docker ps | grep postgres

# 2. DB 재시작
docker-compose restart postgres

# 3. Prisma 재생성
npx prisma generate
```

---

## 📞 추가 도움

문제 발생 시 확인할 파일:
- `logs/dev.log` - 개발 서버 로그
- `.env` - 환경 변수 설정
- `package.json` - 패키지 버전
- `prisma/schema.prisma` - DB 스키마

주요 URL:
- 홈: `http://nas-ip:3000`
- 알림: `http://nas-ip:3000/alerts`
- 스케줄: `http://nas-ip:3000/scheduler`
- 시스템: `http://nas-ip:3000/system`

---

**배포 후 꼭 테스트하세요!**
1. Discord 웹훅 테스트
2. 알림 생성 및 크롤링
3. 스케줄 즉시 실행
4. 서버 재시작 후 확인
