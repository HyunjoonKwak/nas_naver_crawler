#!/bin/bash
# NAS 환경용 네이버 부동산 크롤러 설치 스크립트

set -e

echo "=========================================="
echo "NAS 환경용 네이버 부동산 크롤러 설치 시작"
echo "=========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Docker 설치 확인
check_docker() {
    log_info "Docker 설치 확인 중..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되지 않았습니다."
        echo "Docker 설치 방법:"
        echo "  Ubuntu/Debian: sudo apt-get install docker.io docker-compose"
        echo "  CentOS/RHEL: sudo yum install docker docker-compose"
        echo "  Synology DSM: Docker 패키지 설치"
        echo "  QNAP QTS: Container Station 설치"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose가 설치되지 않았습니다."
        echo "Docker Compose 설치 방법:"
        echo "  pip install docker-compose"
        echo "  또는 최신 Docker Desktop 사용"
        exit 1
    fi
    
    log_info "Docker 및 Docker Compose 확인 완료"
}

# 시스템 리소스 확인
check_resources() {
    log_info "시스템 리소스 확인 중..."
    
    # 메모리 확인
    total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$total_mem" -lt 2048 ]; then
        log_warn "시스템 메모리가 부족할 수 있습니다. (현재: ${total_mem}MB, 권장: 4GB 이상)"
    else
        log_info "메모리 확인 완료: ${total_mem}MB"
    fi
    
    # 디스크 공간 확인
    available_space=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$available_space" -lt 2 ]; then
        log_warn "디스크 공간이 부족할 수 있습니다. (현재: ${available_space}GB, 권장: 2GB 이상)"
    else
        log_info "디스크 공간 확인 완료: ${available_space}GB"
    fi
}

# 디렉토리 생성
create_directories() {
    log_info "필요한 디렉토리 생성 중..."
    
    mkdir -p crawled_data
    mkdir -p logs
    mkdir -p scripts
    
    log_info "디렉토리 생성 완료"
}

# 환경설정 파일 설정
setup_config() {
    log_info "환경설정 파일 설정 중..."
    
    if [ ! -f "config.env" ]; then
        log_error "config.env 파일이 없습니다."
        exit 1
    fi
    
    # config.env 파일 권한 설정
    chmod 600 config.env
    
    log_info "환경설정 파일 설정 완료"
}

# Docker 이미지 빌드
build_docker_image() {
    log_info "Docker 이미지 빌드 중..."
    
    # Docker 이미지 빌드
    docker build -t naver-realestate-crawler .
    
    if [ $? -eq 0 ]; then
        log_info "Docker 이미지 빌드 완료"
    else
        log_error "Docker 이미지 빌드 실패"
        exit 1
    fi
}

# 테스트 실행
test_run() {
    log_info "테스트 실행 중..."
    
    # 테스트용 단일 실행
    docker run --rm \
        --env-file config.env \
        -v "$(pwd)/crawled_data:/app/crawled_data" \
        -v "$(pwd)/logs:/app/logs" \
        naver-realestate-crawler 22065
    
    if [ $? -eq 0 ]; then
        log_info "테스트 실행 성공"
    else
        log_warn "테스트 실행 실패 (네트워크 문제일 수 있음)"
    fi
}

# 서비스 시작
start_service() {
    log_info "서비스 시작 중..."
    
    # Docker Compose로 서비스 시작
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        log_info "서비스 시작 완료"
    else
        log_error "서비스 시작 실패"
        exit 1
    fi
}

# 설치 후 설정
post_install_setup() {
    log_info "설치 후 설정 중..."
    
    # 실행 권한 설정
    chmod +x nas_playwright_crawler.py
    chmod +x scheduler.py
    chmod +x install.sh
    
    # 로그 파일 권한 설정
    chmod 755 logs/
    
    log_info "설치 후 설정 완료"
}

# 설치 완료 메시지
show_completion_message() {
    echo ""
    echo "=========================================="
    echo "설치 완료!"
    echo "=========================================="
    echo ""
    echo "사용 방법:"
    echo "1. 서비스 상태 확인:"
    echo "   docker-compose ps"
    echo ""
    echo "2. 로그 확인:"
    echo "   docker-compose logs -f naver-realestate-crawler"
    echo ""
    echo "3. 서비스 중지:"
    echo "   docker-compose down"
    echo ""
    echo "4. 서비스 재시작:"
    echo "   docker-compose restart"
    echo ""
    echo "5. 설정 변경:"
    echo "   nano config.env"
    echo "   docker-compose restart"
    echo ""
    echo "크롤링된 데이터는 './crawled_data/' 폴더에 저장됩니다."
    echo ""
}

# 메인 실행
main() {
    check_docker
    check_resources
    create_directories
    setup_config
    build_docker_image
    post_install_setup
    
    # 사용자에게 테스트 실행 여부 확인
    echo ""
    read -p "테스트 실행을 하시겠습니까? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_run
    fi
    
    # 사용자에게 서비스 시작 여부 확인
    echo ""
    read -p "서비스를 시작하시겠습니까? (Y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        start_service
    fi
    
    show_completion_message
}

# 스크립트 실행
main "$@"
