#!/bin/bash
# systemd 문제 완전 해결용 빌드 스크립트

set -e

echo "=========================================="
echo "systemd 문제 해결용 빌드 시작"
echo "=========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 기존 이미지 및 컨테이너 정리
log_info "기존 Docker 리소스 정리 중..."
docker system prune -af
docker volume prune -f

# 빌드 옵션 선택
echo ""
echo "빌드 방법을 선택하세요:"
echo "1) 간단한 버전 (Playwright 없이, 가장 안정적)"
echo "2) 안전한 Playwright 버전 (폰트 문제 해결)"
echo "3) systemd 완전 제거 버전"
echo "4) Alpine Linux 기반 (가장 가벼움)"
echo "5) Ubuntu 기반 최소 버전"
echo ""

read -p "선택 (1-5): " choice

case $choice in
    1)
        log_info "간단한 버전 빌드 시작 (Playwright 없이)..."
        DOCKERFILE="Dockerfile.simple"
        TAG="naver-crawler-simple"
        ;;
    2)
        log_info "안전한 Playwright 버전 빌드 시작..."
        DOCKERFILE="Dockerfile.safe"
        TAG="naver-crawler-safe"
        ;;
    3)
        log_info "systemd 완전 제거 버전 빌드 시작..."
        DOCKERFILE="Dockerfile.no-systemd"
        TAG="naver-crawler-no-systemd"
        ;;
    4)
        log_info "Alpine Linux 기반 빌드 시작..."
        DOCKERFILE="Dockerfile.alpine"
        TAG="naver-crawler-alpine"
        ;;
    5)
        log_info "Ubuntu 기반 최소 버전 빌드 시작..."
        DOCKERFILE="Dockerfile.ubuntu-minimal"
        TAG="naver-crawler-ubuntu"
        ;;
    *)
        log_error "잘못된 선택입니다."
        exit 1
        ;;
esac

# Docker 빌드 실행
log_info "Docker 이미지 빌드 중..."
log_info "Dockerfile: $DOCKERFILE"
log_info "태그: $TAG:latest"

docker build \
    -f $DOCKERFILE \
    -t $TAG:latest \
    --no-cache \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    log_info "✅ Docker 이미지 빌드 성공!"
    
    # 이미지 크기 확인
    log_info "이미지 정보:"
    docker images $TAG:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    # 간단한 테스트
    echo ""
    read -p "간단한 테스트를 실행하시겠습니까? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "테스트 실행 중..."
        
        # 테스트용 컨테이너 실행
        docker run --rm \
            --env-file config.env \
            -v "$(pwd)/crawled_data:/app/crawled_data" \
            $TAG:latest --help
        
        if [ $? -eq 0 ]; then
            log_info "✅ 테스트 성공!"
        else
            log_warn "⚠️ 테스트 실패 (네트워크 문제일 수 있음)"
        fi
    fi
    
    # docker-compose.yml 업데이트
    if [ -f "docker-compose.yml" ]; then
        log_info "docker-compose.yml 이미지 태그 업데이트 중..."
        sed -i.bak "s/image: .*/image: $TAG:latest/" docker-compose.yml
        log_info "docker-compose.yml 업데이트 완료"
    fi
    
    echo ""
    echo "=========================================="
    echo "빌드 완료!"
    echo "=========================================="
    echo ""
    echo "사용 방법:"
    echo "1. 단일 실행:"
    echo "   docker run --rm --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data $TAG:latest 22065"
    echo ""
    echo "2. 백그라운드 실행:"
    echo "   docker run -d --name naver-crawler --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data $TAG:latest"
    echo ""
    echo "3. Docker Compose 실행:"
    echo "   docker-compose up -d"
    echo ""
    
else
    log_error "❌ Docker 이미지 빌드 실패!"
    echo ""
    echo "다음 방법들을 시도해보세요:"
    echo "1. Alpine Linux 버전:"
    echo "   ./fix_build.sh (선택: 2)"
    echo ""
    echo "2. 수동 빌드:"
    echo "   docker build -f Dockerfile.no-systemd -t naver-crawler ."
    echo ""
    echo "3. 기존 이미지 사용:"
    echo "   docker pull python:3.11-slim"
    echo ""
    exit 1
fi
