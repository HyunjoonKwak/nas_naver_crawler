#!/bin/bash
# NAS 환경용 Docker 이미지 빌드 스크립트

set -e

echo "=========================================="
echo "NAS 환경용 Docker 이미지 빌드 시작"
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

# Docker 빌드 옵션 선택
echo ""
echo "Docker 빌드 옵션을 선택하세요:"
echo "1) 최소 버전 (빠른 빌드, 기본 기능만)"
echo "2) 전체 버전 (모든 기능 포함)"
echo "3) 기존 이미지 정리 후 빌드"
echo ""

read -p "선택 (1-3): " choice

case $choice in
    1)
        log_info "최소 버전으로 빌드 시작..."
        DOCKERFILE="Dockerfile.minimal"
        REQUIREMENTS="requirements.minimal.txt"
        TAG="naver-crawler-minimal"
        ;;
    2)
        log_info "전체 버전으로 빌드 시작..."
        DOCKERFILE="Dockerfile"
        REQUIREMENTS="requirements.txt"
        TAG="naver-crawler-full"
        ;;
    3)
        log_info "기존 이미지 정리 후 빌드..."
        docker system prune -f
        docker image prune -f
        DOCKERFILE="Dockerfile"
        REQUIREMENTS="requirements.txt"
        TAG="naver-crawler-full"
        ;;
    *)
        log_error "잘못된 선택입니다."
        exit 1
        ;;
esac

# 빌드 컨텍스트 준비
log_info "빌드 컨텍스트 준비 중..."

# requirements 파일 복사
cp $REQUIREMENTS requirements_temp.txt

# Docker 빌드 실행
log_info "Docker 이미지 빌드 중... (시간이 걸릴 수 있습니다)"
log_info "Dockerfile: $DOCKERFILE"
log_info "Requirements: $REQUIREMENTS"

# 빌드 명령어 실행
docker build \
    -f $DOCKERFILE \
    -t $TAG:latest \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --no-cache \
    .

if [ $? -eq 0 ]; then
    log_info "Docker 이미지 빌드 완료!"
    log_info "이미지 태그: $TAG:latest"
    
    # 이미지 크기 확인
    log_info "이미지 크기:"
    docker images $TAG:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # 테스트 실행 여부 확인
    echo ""
    read -p "테스트 실행을 하시겠습니까? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "테스트 실행 중..."
        
        # 테스트용 컨테이너 실행
        docker run --rm \
            --env-file config.env \
            -v "$(pwd)/crawled_data:/app/crawled_data" \
            -v "$(pwd)/logs:/app/logs" \
            $TAG:latest 22065
        
        if [ $? -eq 0 ]; then
            log_info "테스트 실행 성공!"
        else
            log_warn "테스트 실행 실패 (네트워크 문제일 수 있음)"
        fi
    fi
    
    # docker-compose.yml 업데이트
    if [ -f "docker-compose.yml" ]; then
        log_info "docker-compose.yml 이미지 태그 업데이트 중..."
        sed -i.bak "s/image: .*/image: $TAG:latest/" docker-compose.yml
        log_info "docker-compose.yml 업데이트 완료"
    fi
    
else
    log_error "Docker 이미지 빌드 실패!"
    exit 1
fi

# 임시 파일 정리
rm -f requirements_temp.txt

echo ""
echo "=========================================="
echo "빌드 완료!"
echo "=========================================="
echo ""
echo "사용 방법:"
echo "1. 서비스 시작:"
echo "   docker-compose up -d"
echo ""
echo "2. 직접 실행:"
echo "   docker run -d --env-file config.env -v \$(pwd)/crawled_data:/app/crawled_data $TAG:latest"
echo ""
echo "3. 로그 확인:"
echo "   docker logs <container_name>"
echo ""
