#!/bin/bash
# 최종 Playwright 버전 빌드 스크립트

echo "=========================================="
echo "네이버 부동산 크롤러 빌드 시작"
echo "Playwright 헤드리스 모드 지원"
echo "=========================================="

# 기존 리소스 정리
echo "기존 Docker 리소스 정리 중..."
docker system prune -f

# Docker 이미지 빌드
echo "Docker 이미지 빌드 중..."
docker build \
    -t naver-crawler:latest \
    --no-cache \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 빌드 성공!"
    
    # 이미지 크기 확인
    echo "이미지 크기:"
    docker images naver-crawler:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    echo ""
    echo "=========================================="
    echo "빌드 완료!"
    echo "=========================================="
    echo ""
    echo "사용 방법:"
    echo "1. 테스트 실행:"
    echo "   ./crawl.sh"
    echo ""
    echo "2. 다른 단지:"
    echo "   ./crawl.sh 12345"
    echo ""
    echo "3. 직접 실행:"
    echo "   docker run --rm --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler:latest python nas_playwright_crawler.py 22065"
    echo ""
    
else
    echo "❌ 빌드 실패!"
    echo ""
    echo "README_NAS.md를 참고하여 문제를 해결하세요."
    exit 1
fi
