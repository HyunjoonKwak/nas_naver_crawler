#!/bin/bash
# 네이버 부동산 크롤러 실행 스크립트

# 디렉토리 확인 및 생성
mkdir -p crawled_data logs

# 단지 번호 설정
COMPLEX_NO=${1:-22065}

echo "네이버 부동산 크롤링 시작: 단지번호 $COMPLEX_NO"

# 크롤링 실행
docker run --rm \
    --env-file config.env \
    -v "$(pwd)/crawled_data:/app/crawled_data" \
    -v "$(pwd)/logs:/app/logs" \
    naver-crawler:latest \
    python nas_playwright_crawler.py "$COMPLEX_NO"

# 결과 확인
if [ $? -eq 0 ]; then
    echo "✅ 크롤링 성공!"
    echo ""
    echo "결과 파일:"
    ls -lh crawled_data/ | tail -n 3
    echo ""
    echo "최신 파일 내용 확인:"
    LATEST_FILE=$(ls -t crawled_data/*.json | head -1)
    if [ -f "$LATEST_FILE" ]; then
        echo "파일: $LATEST_FILE"
        echo ""
        cat "$LATEST_FILE" | grep -A 5 "complexName" | head -15
    fi
else
    echo "❌ 크롤링 실패!"
    echo "로그 확인:"
    ls -lh logs/ | tail -n 3
fi
