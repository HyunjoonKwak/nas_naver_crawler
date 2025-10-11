#!/bin/bash
# 웹 서버 시작 스크립트

echo "=========================================="
echo "네이버 부동산 크롤러 웹 서버 시작"
echo "=========================================="

# 디렉토리 생성
mkdir -p crawled_data logs

# Docker Compose로 서비스 시작
echo "Docker Compose로 서비스 시작 중..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 웹 서버 시작 성공!"
    echo ""
    echo "=========================================="
    echo "접속 정보"
    echo "=========================================="
    echo "URL: http://localhost:3000"
    echo "또는: http://$(hostname -I | awk '{print $1}'):3000"
    echo ""
    echo "=========================================="
    echo "관리 명령어"
    echo "=========================================="
    echo "로그 확인: docker-compose logs -f web"
    echo "서비스 중지: docker-compose down"
    echo "서비스 재시작: docker-compose restart"
    echo ""
else
    echo "❌ 웹 서버 시작 실패!"
    echo "docker-compose logs web 명령어로 로그를 확인하세요."
    exit 1
fi
