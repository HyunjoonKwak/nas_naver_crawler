# 네이버 부동산 크롤러 (NAS 환경용)

스크린이 없는 NAS 환경에서 헤드리스 모드로 동작하는 네이버 부동산 크롤러입니다.

## 🚀 빠른 시작

```bash
# 1. 빌드
./build.sh

# 2. 실행
./crawl.sh

# 3. 다른 단지
./crawl.sh 12345
```

자세한 내용은 [QUICKSTART.md](QUICKSTART.md)를 참고하세요.

## 📋 주요 기능

- ✅ **헤드리스 모드**: 스크린이 없는 NAS에서 동작
- ✅ **Playwright 지원**: 실제 브라우저로 429 에러 회피
- ✅ **Docker 지원**: 의존성 문제 해결 및 쉬운 배포
- ✅ **스케줄링**: 정기적인 크롤링 자동화
- ✅ **다중 단지 지원**: 여러 단지를 한 번에 크롤링
- ✅ **데이터 저장**: JSON, CSV 형식으로 결과 저장

## 📁 파일 구조

```
property_manager/
├── Dockerfile              # Docker 이미지 정의
├── docker-compose.yml      # Docker Compose 설정
├── requirements.txt        # Python 패키지 의존성
├── config.env             # 환경설정 파일
├── build.sh               # 빌드 스크립트
├── crawl.sh               # 실행 스크립트
├── setup_dirs.sh          # 디렉토리 설정
├── install.sh             # 전체 설치 스크립트
├── nas_playwright_crawler.py  # Playwright 크롤러
├── simple_crawler.py      # 간단한 크롤러 (백업용)
├── scheduler.py           # 스케줄러
├── README.md              # 이 파일
├── QUICKSTART.md          # 빠른 시작 가이드
└── README_NAS.md          # 상세 설명서
```

## 🛠️ 시스템 요구사항

- **Docker**: 버전 20.10 이상
- **Docker Compose**: 버전 2.0 이상
- **CPU**: 최소 2코어 (권장: 4코어)
- **RAM**: 최소 4GB (권장: 8GB)
- **저장공간**: 최소 2GB

## 📖 문서

- [QUICKSTART.md](QUICKSTART.md) - 5분 안에 시작하기
- [README_NAS.md](README_NAS.md) - 상세 설명 및 문제 해결

## 🎯 사용 예시

### 기본 사용
```bash
# 기본 단지 (22065) 크롤링
./crawl.sh

# 특정 단지 크롤링
./crawl.sh 12345
```

### 여러 단지 크롤링
```bash
docker run --rm \
    --env-file config.env \
    -v $(pwd)/crawled_data:/app/crawled_data \
    -v $(pwd)/logs:/app/logs \
    naver-crawler:latest \
    python nas_playwright_crawler.py "22065,12345,67890"
```

### 정기 실행 (Cron)
```bash
# 매일 오전 9시에 실행
0 9 * * * cd /path/to/property_manager && ./crawl.sh >> logs/cron.log 2>&1
```

## 📊 출력 데이터

### 저장 위치
- **경로**: `./crawled_data/`
- **형식**: JSON, CSV
- **파일명**: `complexes_[개수]_[날짜시간].json/csv`

### 데이터 구조
```json
{
  "crawling_info": {
    "complex_no": "22065",
    "crawling_date": "2025-01-31T10:30:00"
  },
  "overview": {
    "complexName": "동탄시범다은마을월드메르디앙반도유보라",
    "totalHouseHoldCount": 1473,
    "totalDongCount": 18,
    "minArea": 81.49,
    "maxArea": 116.49
  }
}
```

## ⚙️ 설정

`config.env` 파일을 수정하여 설정을 변경할 수 있습니다:

```bash
OUTPUT_DIR=./crawled_data    # 출력 디렉토리
REQUEST_DELAY=2.0            # 요청 간격 (초)
TIMEOUT=30000                # 타임아웃 (밀리초)
HEADLESS=true                # 헤드리스 모드
```

## 🔧 문제 해결

자세한 문제 해결 방법은 [README_NAS.md](README_NAS.md)를 참고하세요.

### 일반적인 문제

1. **429 에러**: REQUEST_DELAY를 늘리거나 시간이 지난 후 재시도
2. **Docker 빌드 실패**: `docker system prune -f` 후 재시도
3. **디렉토리 마운트 오류**: `mkdir -p crawled_data logs` 실행

## 📄 라이선스

MIT License

## 👤 작성자

Special Risk

## 🙏 감사의 말

이 프로젝트는 교육 및 연구 목적으로 제작되었습니다. 네이버의 이용약관을 준수하여 사용하시기 바랍니다.
