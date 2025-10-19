# 🚀 NAS 배포 가이드

## ⚠️ 중요: zod 패키지 설치 필요

최근 업데이트로 `zod` 패키지가 추가되었습니다. 배포 시 패키지 설치가 필요합니다.

---

## 📦 배포 방법 (2가지 옵션)

### ✅ **옵션 1: 자동 재빌드 (권장)**

가장 안전한 방법입니다. Docker 이미지를 완전히 다시 빌드합니다.

```bash
# NAS SSH 접속 후
cd /volume1/docker/naver-crawler

# 최신 코드 가져오기
git pull origin main

# 컨테이너 중지 및 제거
docker-compose down

# 이미지 재빌드 및 컨테이너 시작
docker-compose up -d --build

# 로그 확인 (에러가 없는지 체크)
docker-compose logs -f web
```

**예상 시간:** 3~5분

---

### ⚡ **옵션 2: 빠른 설치 (개발 모드)**

현재 개발 모드로 운영 중이므로, 컨테이너 내부에서 직접 설치할 수 있습니다.

```bash
# NAS SSH 접속 후
cd /volume1/docker/naver-crawler

# 최신 코드 가져오기
git pull origin main

# 실행 중인 웹 컨테이너에 접속
docker-compose exec web sh

# 컨테이너 내부에서 패키지 설치
npm install

# 컨테이너 종료
exit

# 웹 서비스 재시작
docker-compose restart web

# 로그 확인
docker-compose logs -f web
```

**예상 시간:** 30초 ~ 1분

---

## 🔍 설치 확인

웹 서비스가 정상적으로 시작되면 다음 메시지가 표시됩니다:

```
✓ Ready in 3s
✓ Local: http://localhost:3000
✅ Environment variables validated
```

에러가 없으면 성공입니다!

---

## ❌ 문제 해결

### 에러: `Module not found: Can't resolve 'zod'`

**원인:** npm install이 실행되지 않음

**해결:**
```bash
# 옵션 1 시도 (재빌드)
docker-compose down
docker-compose up -d --build

# 또는 옵션 2 시도 (직접 설치)
docker-compose exec web npm install
docker-compose restart web
```

### 에러: `Cannot find module 'zod'`

**원인:** node_modules가 마운트되지 않음

**해결:**
```bash
# docker-compose.yml 확인
# volumes에 node_modules가 제외되어 있는지 확인

# 강제 재설치
docker-compose down
docker volume prune  # 주의: 캐시 삭제
docker-compose up -d --build
```

---

## 📋 배포 체크리스트

배포 전 확인사항:

- [ ] `.env` 파일에 `NEXTAUTH_SECRET` 설정 (32자 이상)
- [ ] `DATABASE_URL` 정상 설정 확인
- [ ] `git pull` 완료
- [ ] `npm install` 실행 (또는 재빌드)
- [ ] 로그에 에러 없음 확인
- [ ] 웹 브라우저에서 접속 테스트

---

## 🎯 권장 배포 방법

```bash
# 1. 코드 가져오기
cd /volume1/docker/naver-crawler
git pull origin main

# 2. 재빌드 (안전)
docker-compose down
docker-compose up -d --build

# 3. 로그 확인
docker-compose logs -f web

# 4. 정상 동작 확인
# 브라우저에서 http://YOUR_NAS_IP:3000 접속
```

---

## 📞 문제 발생 시

로그를 확인하여 문제를 파악하세요:

```bash
# 실시간 로그 확인
docker-compose logs -f web

# 최근 100줄 로그
docker-compose logs --tail=100 web

# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 내부 확인
docker-compose exec web sh
ls -la node_modules/zod  # zod 설치 확인
```
