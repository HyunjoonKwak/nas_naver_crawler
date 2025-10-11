#!/bin/bash
# 빠른 테스트용 빌드 스크립트

echo "=========================================="
echo "빠른 테스트 빌드 시작"
echo "=========================================="

# 기존 리소스 정리
docker system prune -f

# systemd 제거 버전으로 빠른 빌드
echo "systemd 제거 버전 빌드 중..."
docker build \
    -f Dockerfile.no-systemd \
    -t naver-crawler-test:latest \
    --no-cache \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공!"
    
    # 이미지 크기 확인
    echo "이미지 크기:"
    docker images naver-crawler-test:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # 간단한 테스트
    echo ""
    echo "간단한 테스트 실행 중..."
    docker run --rm \
        --env-file config.env \
        -v "$(pwd)/crawled_data:/app/crawled_data" \
        naver-crawler-test:latest --help
    
    echo ""
    echo "✅ 테스트 완료!"
    echo ""
    echo "사용 방법:"
    echo "docker run --rm --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-test:latest 22065"
    
else
    echo "❌ 빌드 실패!"
    echo "다음 방법을 시도해보세요:"
    echo "1. ./fix_build.sh (선택: 1)"
    echo "2. Alpine 버전: ./fix_build.sh (선택: 2)"
fi
