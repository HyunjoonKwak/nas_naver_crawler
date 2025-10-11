#!/bin/bash
# 간단한 크롤러 빠른 빌드 스크립트

echo "=========================================="
echo "간단한 크롤러 빠른 빌드 시작"
echo "=========================================="

# 기존 리소스 정리
docker system prune -f

# 간단한 버전으로 빠른 빌드
echo "간단한 버전 빌드 중 (Playwright 없이)..."
docker build \
    -f Dockerfile.simple \
    -t naver-crawler-simple:latest \
    --no-cache \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공!"
    
    # 이미지 크기 확인
    echo "이미지 크기:"
    docker images naver-crawler-simple:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # 간단한 테스트
    echo ""
    echo "간단한 테스트 실행 중..."
    docker run --rm \
        --env-file config.env \
        -v "$(pwd)/crawled_data:/app/crawled_data" \
        naver-crawler-simple:latest --help
    
    echo ""
    echo "✅ 테스트 완료!"
    echo ""
    echo "사용 방법:"
    echo "1. 테스트 실행:"
    echo "   docker run --rm --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-simple:latest 22065"
    echo ""
    echo "2. 백그라운드 실행:"
    echo "   docker run -d --name naver-crawler --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-simple:latest"
    echo ""
    echo "3. 로그 확인:"
    echo "   docker logs naver-crawler"
    
else
    echo "❌ 빌드 실패!"
    echo "다음 방법을 시도해보세요:"
    echo "1. ./fix_build.sh (선택: 1)"
    echo "2. 안전한 Playwright 버전: ./fix_build.sh (선택: 2)"
fi
