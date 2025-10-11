# NAS 환경용 네이버 부동산 크롤러

스크린이 없는 NAS 환경에서 헤드리스 모드로 동작하는 네이버 부동산 크롤러입니다.

## 🚀 주요 기능

- **헤드리스 모드**: 스크린이 없는 NAS에서도 동작
- **Docker 지원**: 의존성 문제 해결 및 쉬운 배포
- **스케줄링**: 정기적인 크롤링 자동화
- **다중 단지 지원**: 여러 단지를 한 번에 크롤링
- **데이터 저장**: JSON, CSV 형식으로 결과 저장
- **알림 기능**: 이메일, 웹훅 알림 지원

## 📋 시스템 요구사항

### NAS 하드웨어
- **CPU**: 최소 2코어 (권장: 4코어 이상)
- **RAM**: 최소 4GB (권장: 8GB 이상)
- **저장공간**: 최소 2GB 여유공간
- **네트워크**: 인터넷 연결 필수

### 소프트웨어
- **Docker**: 버전 20.10 이상
- **Docker Compose**: 버전 2.0 이상
- **운영체제**: Linux (Ubuntu, CentOS, Synology DSM, QNAP QTS 등)

## 🛠️ 설치 방법

### 1. 파일 다운로드
```bash
# 프로젝트 클론 또는 파일 다운로드
git clone <repository-url>
cd property_manager
```

### 2. 환경설정
```bash
# 설정 파일 복사 및 편집
cp config.env.example config.env
nano config.env
```

### 3. Docker 이미지 빌드
```bash
# Docker 이미지 빌드
docker build -t naver-realestate-crawler .
```

### 4. 컨테이너 실행
```bash
# Docker Compose로 실행
docker-compose up -d

# 또는 단일 컨테이너로 실행
docker run -d \
  --name naver-crawler \
  --env-file config.env \
  -v $(pwd)/crawled_data:/app/crawled_data \
  naver-realestate-crawler
```

## ⚙️ 설정 가이드

### config.env 파일 설정
```bash
# 기본 설정
OUTPUT_DIR=./crawled_data          # 데이터 저장 경로
REQUEST_DELAY=2.0                  # 요청 간격 (초)
HEADLESS=true                      # 헤드리스 모드
TIMEOUT=30000                      # 타임아웃 (밀리초)

# 크롤링 대상 설정
COMPLEX_NUMBERS=22065,12345        # 단지 번호들 (쉼표 구분)

# 알림 설정 (선택사항)
EMAIL_NOTIFICATIONS=true
SMTP_SERVER=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
NOTIFICATION_EMAIL=notification@example.com
```

### 단지 번호 찾는 방법
1. 네이버 부동산 사이트 접속
2. 원하는 단지 페이지로 이동
3. URL에서 단지 번호 확인
   - 예: `https://new.land.naver.com/complexes/22065` → 단지번호: `22065`

## 🚀 사용 방법

### 1. 수동 실행
```bash
# 단일 단지 크롤링
python nas_playwright_crawler.py 22065

# 여러 단지 크롤링
python nas_playwright_crawler.py 22065,12345,67890
```

### 2. Docker로 실행
```bash
# Docker Compose 사용
docker-compose up -d

# 컨테이너 로그 확인
docker-compose logs -f naver-realestate-crawler
```

### 3. 스케줄링 설정
```bash
# crontab 편집
crontab -e

# 매일 오전 9시에 실행
0 9 * * * cd /path/to/property_manager && docker-compose run --rm naver-realestate-crawler

# 매주 월요일 오전 9시에 실행
0 9 * * 1 cd /path/to/property_manager && docker-compose run --rm naver-realestate-crawler
```

## 📁 출력 데이터

### 저장 위치
- **경로**: `./crawled_data/`
- **형식**: JSON, CSV
- **파일명**: `complexes_[개수]_[날짜시간].json/csv`

### 데이터 구조
```json
{
  "crawling_info": {
    "complex_no": "22065",
    "crawling_date": "2025-01-31T10:30:00",
    "crawler_version": "1.0.0"
  },
  "overview": {
    "complexName": "동탄시범다은마을월드메르디앙반도유보라",
    "complexNo": "22065",
    "totalHouseHoldCount": 1473,
    "totalDongCount": 18,
    "minArea": 81.49,
    "maxArea": 116.49,
    "minPrice": 58500,
    "maxPrice": 96000
  },
  "articles": {
    "articleList": [...]
  }
}
```

## 🔧 문제 해결

### 일반적인 문제들

#### 0. Docker 빌드 시 debconf 오류
```bash
# 오류: debconf: unable to initialize frontend: Dialog
# 해결방법 1: 최소 버전 사용
./build_nas.sh
# 선택: 1 (최소 버전)

# 해결방법 2: 환경변수 설정
export DEBIAN_FRONTEND=noninteractive
docker build -f Dockerfile.minimal -t naver-crawler-minimal .

# 해결방법 3: 기존 이미지 정리 후 빌드
docker system prune -f
./build_nas.sh
# 선택: 3 (정리 후 빌드)
```

#### 1. 메모리 부족 오류
```bash
# Docker 리소스 제한 조정
# docker-compose.yml에서 memory limit 증가
deploy:
  resources:
    limits:
      memory: 4G  # 2G에서 4G로 증가
```

#### 2. 네트워크 연결 오류
```bash
# DNS 설정 확인
docker run --dns=8.8.8.8 --dns=8.8.4.4 naver-realestate-crawler
```

#### 3. 권한 오류
```bash
# 파일 권한 설정
chmod +x nas_playwright_crawler.py
chmod 755 crawled_data/
```

#### 4. 브라우저 설치 실패
```bash
# Playwright 브라우저 재설치
docker exec -it naver-crawler playwright install chromium
docker exec -it naver-crawler playwright install-deps chromium
```

### 로그 확인
```bash
# Docker 로그 확인
docker-compose logs -f naver-realestate-crawler

# 상세 로그 확인
docker-compose logs --tail=100 naver-realestate-crawler
```

## 📊 모니터링

### 헬스체크
```bash
# 컨테이너 상태 확인
docker ps

# 헬스체크 상태 확인
docker inspect naver-realestate-crawler | grep -A 10 Health
```

### 리소스 사용량 모니터링
```bash
# CPU, 메모리 사용량 확인
docker stats naver-realestate-crawler

# 디스크 사용량 확인
du -sh crawled_data/
```

## 🔐 보안 고려사항

1. **환경변수 보안**: `config.env` 파일의 민감한 정보 보호
2. **네트워크 보안**: 필요한 포트만 열기
3. **로그 관리**: 민감한 정보가 로그에 기록되지 않도록 주의
4. **정기 업데이트**: Docker 이미지 및 의존성 패키지 정기 업데이트

## 📞 지원 및 문의

### 문제 신고
- GitHub Issues를 통해 버그 리포트
- 로그 파일과 함께 상세한 오류 상황 제공

### 기능 요청
- 새로운 기능이나 개선사항 제안
- 사용 사례와 함께 요청사항 상세 설명

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🔄 업데이트 방법

```bash
# 코드 업데이트
git pull origin main

# Docker 이미지 재빌드
docker-compose build --no-cache

# 컨테이너 재시작
docker-compose down
docker-compose up -d
```

---

**주의사항**: 이 크롤러는 교육 및 연구 목적으로 제작되었습니다. 네이버의 이용약관을 준수하여 사용하시기 바랍니다.
