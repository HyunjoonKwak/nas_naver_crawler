#!/bin/bash
# 완전한 Playwright 버전 빌드 스크립트

echo "=========================================="
echo "완전한 Playwright 버전 빌드 시작"
echo "=========================================="

# 기존 리소스 정리
echo "기존 Docker 리소스 정리 중..."
docker system prune -f

# 완전한 버전으로 빌드
echo "완전한 Playwright 버전 빌드 중..."
docker build \
    -f Dockerfile.complete \
    -t naver-crawler-complete:latest \
    --no-cache \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 빌드 성공!"
    
    # 이미지 크기 확인
    echo "이미지 크기:"
    docker images naver-crawler-complete:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # 간단한 테스트
    echo ""
    read -p "테스트 실행을 하시겠습니까? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "테스트 실행 중..."
        
        # 디렉토리 생성
        mkdir -p crawled_data logs
        
        # 테스트용 컨테이너 실행
        docker run --rm \
            --env-file config.env \
            -v "$(pwd)/crawled_data:/app/crawled_data" \
            -v "$(pwd)/logs:/app/logs" \
            naver-crawler-complete:latest \
            python nas_playwright_crawler.py 22065
        
        if [ $? -eq 0 ]; then
            echo "✅ 테스트 성공!"
            echo ""
            echo "결과 파일:"
            ls -lh crawled_data/ | tail -n 3
        else
            echo "⚠️ 테스트 실패 (네트워크 문제일 수 있음)"
        fi
    fi
    
    echo ""
    echo "=========================================="
    echo "빌드 완료!"
    echo "=========================================="
    echo ""
    echo "사용 방법:"
    echo "1. 테스트 실행:"
    echo "   docker run --rm --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-complete:latest python nas_playwright_crawler.py 22065"
    echo ""
    echo "2. 백그라운드 실행:"
    echo "   docker run -d --name naver-crawler --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data naver-crawler-complete:latest"
    echo ""
    
else
    echo "❌ 빌드 실패!"
    echo ""
    echo "대안:"
    echo "1. 간단한 버전 사용: ./quick_simple_build.sh"
    echo "2. 시간 기다린 후 재시도"
    exit 1
fi
