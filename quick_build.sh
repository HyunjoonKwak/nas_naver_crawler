#!/bin/bash
# NAS 환경용 빠른 빌드 스크립트 (systemd 문제 해결)

echo "=========================================="
echo "NAS 환경용 빠른 빌드 시작"
echo "=========================================="

# 기존 이미지 정리
echo "기존 이미지 정리 중..."
docker system prune -f

# NAS 최적화 버전 빌드
echo "NAS 최적화 버전 빌드 중..."
docker build \
    -f Dockerfile.nas \
    -t naver-crawler-nas:latest \
    --no-cache \
    .

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공!"
    
    # 이미지 크기 확인
    echo "이미지 크기:"
    docker images naver-crawler-nas:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # 간단한 테스트
    echo ""
    echo "간단한 테스트 실행 중..."
    docker run --rm \
        --env-file config.env \
        -v "$(pwd)/crawled_data:/app/crawled_data" \
        naver-crawler-nas:latest --help
    
    echo ""
    echo "=========================================="
    echo "빌드 완료! 사용 방법:"
    echo "=========================================="
    echo "1. 테스트 실행:"
    echo "   docker run --rm --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-nas:latest 22065"
    echo ""
    echo "2. 백그라운드 실행:"
    echo "   docker run -d --name naver-crawler --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-nas:latest"
    echo ""
    echo "3. 로그 확인:"
    echo "   docker logs naver-crawler"
    echo ""
else
    echo "❌ 빌드 실패!"
    echo "다음 방법을 시도해보세요:"
    echo "1. ./build_nas.sh (선택: 4)"
    echo "2. docker build -f Dockerfile.test -t naver-crawler-test ."
    exit 1
fi
