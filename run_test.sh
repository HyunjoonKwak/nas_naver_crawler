#!/bin/bash
# 크롤러 테스트 실행 스크립트

echo "=========================================="
echo "네이버 부동산 크롤러 테스트 실행"
echo "=========================================="

# 필요한 디렉토리 생성
echo "1. 디렉토리 확인 및 생성..."
mkdir -p crawled_data logs
chmod 755 crawled_data logs
echo "✅ 디렉토리 준비 완료"

# config.env 파일 확인
if [ ! -f "config.env" ]; then
    echo "⚠️ config.env 파일이 없습니다. 기본 설정 파일을 생성합니다..."
    cat > config.env << 'EOF'
OUTPUT_DIR=./crawled_data
REQUEST_DELAY=2.0
TIMEOUT=30000
HEADLESS=true
COMPLEX_NUMBERS=22065
LOG_LEVEL=INFO
SAVE_FORMAT=both
EOF
    echo "✅ config.env 생성 완료"
fi

# 단지 번호 입력
if [ -z "$1" ]; then
    COMPLEX_NO="22065"
    echo "기본 단지 번호 사용: $COMPLEX_NO (동탄시범다은마을월드메르디앙반도유보라)"
else
    COMPLEX_NO="$1"
    echo "입력된 단지 번호: $COMPLEX_NO"
fi

# 크롤러 실행
echo ""
echo "2. 크롤링 시작..."
echo "=========================================="
docker run --rm \
    --env-file config.env \
    -v "$(pwd)/crawled_data:/app/crawled_data" \
    -v "$(pwd)/logs:/app/logs" \
    naver-crawler-simple:latest $COMPLEX_NO

# 결과 확인
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 크롤링 성공!"
    echo "=========================================="
    echo ""
    echo "결과 파일 확인:"
    ls -lh crawled_data/ | tail -n 5
    echo ""
    echo "최신 파일 내용 확인:"
    LATEST_FILE=$(ls -t crawled_data/*.json | head -1)
    if [ -f "$LATEST_FILE" ]; then
        echo "파일: $LATEST_FILE"
        echo "크기: $(du -h "$LATEST_FILE" | cut -f1)"
        echo ""
        echo "단지 정보:"
        cat "$LATEST_FILE" | grep -A 5 "complexName" | head -10
    fi
else
    echo ""
    echo "=========================================="
    echo "❌ 크롤링 실패"
    echo "=========================================="
    echo ""
    echo "로그 확인:"
    ls -lh logs/ | tail -n 3
fi
