# 🎉 여기서 시작하세요!

## 네이버 부동산 크롤러 - 웹 UI 버전

사용자 친화적인 웹 인터페이스로 부동산 정보를 쉽게 크롤링하세요!

---

## 🚀 간단하게 시작하기

### 방법 1: 빠른 시작
```bash
./start.sh
```
⏱️ 예상 시간: 10-20초

### 방법 2: 관리 메뉴 사용
```bash
./manage.sh
# → 1번 선택 (웹서버 시작)
```

### 브라우저에서 접속
```
http://localhost:3000
```
또는
```
http://[NAS-IP주소]:3000
```

---

## 🛑 종료하기

### 빠른 종료
```bash
./stop.sh
```

### 관리 메뉴 사용
```bash
./manage.sh
# → 2번 선택 (웹서버 종료)
```

---

## 🎨 웹 UI 기능

✨ **간단한 인터페이스**
- 단지 번호만 입력하면 자동 크롤링
- 실시간 진행 상태 표시
- 아름다운 다크 모드 지원

📊 **실시간 모니터링**
- Docker 상태 확인
- 크롤링된 파일 개수
- 실행 중인 작업 표시

📁 **히스토리 관리**
- 과거 크롤링 결과 조회
- 상세 데이터 보기
- 자동 새로고침

---

## 💻 커맨드라인으로 사용하기

웹 UI 대신 커맨드라인을 선호하신다면:

```bash
# 단일 단지 크롤링
./scripts/crawl.sh 22065

# 여러 단지 크롤링
./scripts/crawl.sh 22065,12345,67890
```

---

## 📱 모바일에서 접속

스마트폰이나 태블릿에서도 사용 가능합니다!

1. 브라우저 열기
2. `http://[NAS-IP주소]:3000` 접속
3. 반응형 디자인으로 최적화된 화면 사용

---

## 🔧 관리 명령어

### 서비스 제어
```bash
# 중지
docker-compose down

# 재시작
docker-compose restart

# 로그 확인
docker-compose logs -f web
```

### 상태 확인
```bash
# 컨테이너 상태
docker-compose ps

# 리소스 사용량
docker stats naver-crawler-web
```

---

## 🆘 문제 해결

### 웹 페이지가 열리지 않아요
```bash
# 1. 서비스 상태 확인
docker-compose ps

# 2. 로그 확인
docker-compose logs web

# 3. 포트 확인
netstat -tuln | grep 3000
```

### 크롤링이 작동하지 않아요
```bash
# 1. Docker 이미지 확인
docker images | grep naver-crawler

# 2. 디렉토리 권한 확인
ls -la crawled_data/ logs/

# 3. config.env 파일 확인
cat config.env
```

---

## 📚 더 알아보기

- [WEB_UI_GUIDE.md](WEB_UI_GUIDE.md) - 웹 UI 상세 가이드
- [QUICKSTART.md](QUICKSTART.md) - CLI 빠른 시작
- [README_NAS.md](README_NAS.md) - NAS 환경 설정

---

## 🎯 다음 단계

1. ✅ 웹 UI에서 테스트 크롤링 실행
2. ✅ 결과 확인
3. ✅ 정기 실행 설정 (Cron)
4. ✅ 알림 설정 (이메일, 웹훅)

---

**즐거운 크롤링 되세요! 🚀**
