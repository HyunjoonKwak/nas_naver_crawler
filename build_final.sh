#!/bin/bash
# 최종 Playwright 버전 빌드 스크립트

echo "=========================================="
echo "최종 Playwright 버전 빌드 시작"
echo "Playwright가 자동으로 모든 의존성 설치"
echo "=========================================="

# 기존 리소스 정리
echo "기존 Docker 리소스 정리 중..."
docker system prune -f

# 최종 버전으로 빌드
echo "최종 Playwright 버전 빌드 중..."
docker build \
    -f Dockerfile.final \
    -t naver-crawler-final:latest \
    --no-cache \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 빌드 성공!"
    
    # 이미지 크기 확인
    echo "이미지 크기:"
    docker images naver-crawler-final:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    echo ""
    echo "=========================================="
    echo "빌드 완료!"
    echo "=========================================="
    echo ""
    echo "사용 방법:"
    echo "1. 테스트 실행:"
    echo "   ./crawl_final.sh"
    echo ""
    echo "2. 다른 단지:"
    echo "   ./crawl_final.sh 12345"
    echo ""
    echo "3. 직접 실행:"
    echo "   docker run --rm --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-final:latest python nas_playwright_crawler.py 22065"
    echo ""
    
else
    echo "❌ 빌드 실패!"
    echo ""
    echo "권장 대안:"
    echo "간단한 버전을 사용하고 몇 시간 후 다시 시도하세요."
    echo "./crawl.sh  # 몇 시간 후"
    exit 1
fi
