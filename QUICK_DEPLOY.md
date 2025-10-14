# 🚀 빠른 배포 가이드 (개발 모드)

> **Phase 1 & 2 배포: 알림 시스템 + 스케줄 크롤링**

---

## 📋 사전 준비

### 필요한 것:
- ✅ NAS SSH 접속 정보
- ✅ Discord 웹훅 URL (선택)
- ✅ Git 저장소 접근 권한

---

## ⚡ 빠른 배포 (5분)

### 1️⃣ 로컬에서 (Mac):

```bash
# 1. 변경사항 커밋
git add .
git commit -m "feat: Phase 1 & 2 완료 - 알림 + 스케줄링"
git push origin main

# 2. 자동 배포 스크립트 실행
./deploy-to-nas.sh
```

스크립트가 묻는 질문에 답하면 자동으로 배포됩니다!

---

### 2️⃣ 수동 배포 (SSH 직접 사용):

```bash
# NAS 접속
ssh user@nas-ip

# 프로젝트 디렉토리로 이동
cd /path/to/nas_naver_crawler

# 코드 업데이트
git pull origin main

# 새 패키지 설치
npm install

# Prisma 재생성
npx prisma generate

# 서버 재시작
pkill -f "next dev"
nohup npm run dev > logs/dev.log 2>&1 &

# 서버 확인
tail -f logs/dev.log
```

---

## 🧪 배포 확인 (2분)

### 자동 테스트:
```bash
# 로컬에서 실행
./test-deployment.sh <NAS_IP>
```

### 수동 확인:
1. **브라우저 접속**: `http://nas-ip:3000`
2. **알림 페이지**: `http://nas-ip:3000/alerts`
3. **스케줄 페이지**: `http://nas-ip:3000/scheduler`

---

## ✅ 초기 설정 (5분)

### 1. Discord 웹훅 설정

1. Discord 서버 → 채널 설정 → 연동 → 웹후크
2. 웹후크 URL 복사
3. 웹 UI에서 `/alerts` 접속
4. "새 알림 만들기"
5. 웹훅 URL 입력
6. "테스트 알림 보내기" → Discord 확인

### 2. 알림 생성

```
이름: 전체 알림
단지: 모든 선호 단지 선택
조건: 제한 없음 (모든 변경사항)
웹훅: Discord 웹훅 URL
```

### 3. 스케줄 생성

```
이름: 매일 오전 크롤링
단지: 모든 선호 단지 선택
주기: "매일 오전 9시" 클릭
```

### 4. 즉시 실행 테스트

1. 스케줄 카드에서 "▶️ 즉시 실행" 클릭
2. 잠시 후 Discord에서 알림 확인
3. 실행 로그 확인

---

## 📊 모니터링

### 실시간 로그:
```bash
# NAS에서
tail -f logs/dev.log

# 알림 로그만
tail -f logs/dev.log | grep -E "(Alert|Discord)"

# 스케줄 로그만
tail -f logs/dev.log | grep -E "(Schedule|Cron)"
```

### 중요 로그 메시지:
```
✅ 정상:
- "✅ Loaded X active schedule(s)"
- "🚀 Executing scheduled crawl"
- "✅ Sent X notification(s)"

❌ 문제:
- "Failed to register schedule"
- "Failed to send Discord notification"
- "ECONNREFUSED"
```

---

## 🔧 문제 해결

### 서버가 안 떠요:
```bash
# 포트 확인
lsof -i :3000

# 프로세스 죽이기
pkill -f "next dev"

# 다시 시작
npm run dev
```

### 알림이 안 와요:
```bash
# 웹훅 URL 테스트
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "테스트"}'

# 알림 활성화 확인
curl http://localhost:3000/api/alerts
```

### 스케줄이 안 돌아요:
```bash
# 스케줄 상태 확인
curl http://localhost:3000/api/schedules

# 스케줄 재로드
curl http://localhost:3000/api/schedules/init

# 로그 확인
tail -f logs/dev.log | grep Schedule
```

---

## 🎯 사용 예시

### 시나리오: 매일 자동 크롤링 + 알림

1. **스케줄 설정**:
   - 매일 오전 9시, 오후 6시 자동 크롤링

2. **알림 설정**:
   - 신규 매물 → Discord 알림
   - 삭제된 매물 → Discord 알림
   - 가격 하락 → Discord 알림

3. **결과**:
   - 아침 9시: 자동 크롤링 → 변경사항 Discord로 수신
   - 저녁 6시: 자동 크롤링 → 변경사항 Discord로 수신

---

## 📱 Discord 알림 예시

```
🆕 신규 매물 발견!
━━━━━━━━━━━━━━━━
🏘️ 단지: 헬리오시티
📊 거래유형: 전세
💰 가격: 5억
📐 면적: 84.5㎡ (25.5평)
🏢 동/호: 101동 1001호
📍 층: 10/20
```

```
✅ 크롤링 완료 - 변경사항 있음
━━━━━━━━━━━━━━━━
🏘️ 단지: 헬리오시티
🆕 신규 매물: 3건
🗑️ 삭제된 매물: 2건
💹 가격 변동: 1건
📊 전체 매물: 25건
⏱️ 소요 시간: 5.4초
```

---

## 🎉 완료!

이제 다음이 자동으로 작동합니다:

✅ **매일 자동 크롤링** (설정한 시간에)
✅ **변경사항 자동 감지** (신규/삭제/가격변동)
✅ **Discord 자동 알림** (조건에 맞는 매물만)
✅ **실행 히스토리 기록** (성공/실패 추적)

---

## 📚 자세한 문서

- 📘 [개발 모드 배포 상세 가이드](DEPLOY_DEV_GUIDE.md)
- 📗 [Phase 1 완료 보고서](PHASE1_COMPLETE.md)
- 📕 [Phase 2 완료 보고서](PHASE2_COMPLETE.md)
- 📙 [알림 시스템 가이드](ALERT_SYSTEM_GUIDE.md)

---

## 🆘 도움이 필요하신가요?

1. **로그 확인**: `tail -f logs/dev.log`
2. **서버 상태**: `ps aux | grep "next dev"`
3. **DB 상태**: `npx prisma db pull`
4. **API 테스트**: `curl http://localhost:3000/api/schedules`

**문제가 계속되면 전체 로그를 확인해주세요!**
