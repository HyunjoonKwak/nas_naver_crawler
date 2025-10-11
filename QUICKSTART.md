# 빠른 시작 가이드

## 🚀 5분 안에 시작하기

### 1. 빌드 (처음 한 번만)
```bash
./quick_simple_build.sh
```

### 2. 디렉토리 설정
```bash
./setup_dirs.sh
```

### 3. 크롤링 실행
```bash
# 간단한 방법
./crawl.sh

# 다른 단지 번호로
./crawl.sh 12345

# 또는 전체 테스트
./run_test.sh
```

## 📝 NAS에서 실행하는 방법

### 1. 파일 업로드
NAS의 원하는 위치에 모든 파일을 업로드합니다.
예: `/volume1/code_work/nas_naver_crawler/`

### 2. SSH로 NAS 접속
```bash
ssh root@your-nas-ip
cd /volume1/code_work/nas_naver_crawler
```

### 3. 디렉토리 생성
```bash
mkdir -p crawled_data logs
chmod 755 crawled_data logs
```

### 4. 설정 파일 생성 (선택사항)
```bash
cat > config.env << 'EOF'
OUTPUT_DIR=./crawled_data
REQUEST_DELAY=2.0
TIMEOUT=30000
COMPLEX_NUMBERS=22065
LOG_LEVEL=INFO
EOF
```

### 5. 크롤링 실행
```bash
# 간단한 실행
./crawl.sh

# 다른 단지 번호
./crawl.sh 12345

# 또는 직접 실행
docker run --rm \
    --env-file config.env \
    -v $(pwd)/crawled_data:/app/crawled_data \
    -v $(pwd)/logs:/app/logs \
    naver-crawler-simple:latest \
    python simple_crawler.py 22065
```

## 📊 결과 확인

### 크롤링된 데이터 확인
```bash
# JSON 파일 확인
ls -lh crawled_data/

# 최신 파일 내용 확인
cat crawled_data/*.json | grep complexName
```

### 로그 확인
```bash
# 로그 파일 확인
ls -lh logs/

# 최신 로그 확인
tail -f logs/*.log
```

## 🔄 정기 실행 (Cron 설정)

### 매일 오전 9시에 실행
```bash
# crontab 편집
crontab -e

# 다음 라인 추가
0 9 * * * cd /volume1/code_work/nas_naver_crawler && ./run_test.sh >> logs/cron.log 2>&1
```

### 매주 월요일 오전 9시에 실행
```bash
0 9 * * 1 cd /volume1/code_work/nas_naver_crawler && ./run_test.sh >> logs/cron.log 2>&1
```

## 🐳 Docker Compose로 실행

### docker-compose.yml 파일 생성
```yaml
version: '3.8'

services:
  crawler:
    image: naver-crawler-simple:latest
    container_name: naver-crawler
    restart: unless-stopped
    env_file:
      - config.env
    volumes:
      - ./crawled_data:/app/crawled_data
      - ./logs:/app/logs
    command: ["python", "simple_crawler.py", "22065"]
```

### 실행
```bash
# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

## ⚠️ 문제 해결

### 1. 디렉토리 마운트 오류
```bash
# 디렉토리 생성
mkdir -p crawled_data logs

# 권한 확인
ls -la | grep -E "crawled_data|logs"
```

### 2. 이미지가 없음
```bash
# 이미지 확인
docker images | grep naver-crawler

# 없으면 빌드
./quick_simple_build.sh
```

### 3. API 요청 제한 (429 에러)
```bash
# config.env에서 REQUEST_DELAY 증가
REQUEST_DELAY=5.0
```

## 💡 팁

### 여러 단지 동시 크롤링
```bash
docker run --rm \
    --env-file config.env \
    -v $(pwd)/crawled_data:/app/crawled_data \
    naver-crawler-simple:latest 22065,12345,67890
```

### 백그라운드 실행
```bash
docker run -d \
    --name naver-crawler \
    --env-file config.env \
    -v $(pwd)/crawled_data:/app/crawled_data \
    naver-crawler-simple:latest 22065
```

### 로그 실시간 확인
```bash
docker logs -f naver-crawler
```

## 📞 도움말

### 명령어 확인
```bash
docker run --rm naver-crawler-simple:latest --help
```

### 이미지 정보
```bash
docker images naver-crawler-simple:latest
```

### 실행 중인 컨테이너 확인
```bash
docker ps | grep naver-crawler
```

---

더 자세한 정보는 `README_NAS.md`를 참고하세요.
