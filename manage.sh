#!/bin/bash
# 웹서버 관리 스크립트

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_blue() {
    echo -e "${BLUE}$1${NC}"
}

show_menu() {
    clear
    echo "=========================================="
    echo "  네이버 부동산 크롤러 관리 메뉴"
    echo "=========================================="
    echo ""
    echo "=== 프로덕션 모드 ==="
    echo "1) 🚀 웹서버 시작"
    echo "2) 🛑 웹서버 종료"
    echo "3) 🔄 웹서버 재시작"
    echo "6) 🔧 빌드"
    echo ""
    echo "=== 개발 모드 (빠른 테스트) ==="
    echo "8) ⚡ 개발 모드 시작 (빌드 불필요)"
    echo "9) 🛑 개발 모드 종료"
    echo ""
    echo "=== 공통 ==="
    echo "4) 📊 상태 확인"
    echo "5) 📝 로그 확인"
    echo "7) 🗑️  데이터 정리"
    echo "0) 🚪 종료"
    echo ""
    echo "=========================================="
}

start_server() {
    ./scripts/start.sh
}

stop_server() {
    ./scripts/stop.sh
}

restart_server() {
    log_info "웹서버 재시작 중..."
    
    docker-compose restart
    
    if [ $? -eq 0 ]; then
        log_info "✅ 웹서버 재시작 완료!"
    else
        log_error "❌ 웹서버 재시작 실패!"
        return 1
    fi
}

check_status() {
    log_info "시스템 상태 확인 중..."
    echo ""
    
    # 프로덕션/개발 모드 확인
    if docker ps | grep -q "naver-crawler-web-dev"; then
        log_blue "🔧 개발 모드 실행 중"
        echo ""
        echo "=== 개발 모드 컨테이너 상태 ==="
        docker-compose -f docker-compose.dev.yml ps
        echo ""
        echo "=== 리소스 사용량 ==="
        docker stats --no-stream naver-crawler-web-dev 2>/dev/null
    elif docker ps | grep -q "naver-crawler-web"; then
        log_blue "🚀 프로덕션 모드 실행 중"
        echo ""
        echo "=== 프로덕션 컨테이너 상태 ==="
        docker-compose ps
        echo ""
        echo "=== 리소스 사용량 ==="
        docker stats --no-stream naver-crawler-web 2>/dev/null
    else
        log_warn "웹서버가 실행 중이 아닙니다."
    fi
    echo ""
    
    # 크롤링된 파일 개수
    echo "=== 크롤링 데이터 ==="
    FILE_COUNT=$(ls -1 crawled_data/*.json 2>/dev/null | wc -l)
    echo "크롤링된 파일: ${FILE_COUNT}개"
    
    if [ $FILE_COUNT -gt 0 ]; then
        echo "최신 파일:"
        ls -lht crawled_data/*.json | head -3
    fi
    echo ""
}

view_logs() {
    log_info "로그 확인 중..."
    echo ""
    
    # 개발/프로덕션 모드 확인
    if docker ps | grep -q "naver-crawler-web-dev"; then
        log_blue "개발 모드 로그를 확인합니다. (Ctrl+C로 종료)"
        sleep 2
        docker-compose -f docker-compose.dev.yml logs -f web
    elif docker ps | grep -q "naver-crawler-web"; then
        log_blue "프로덕션 모드 로그를 확인합니다. (Ctrl+C로 종료)"
        sleep 2
        docker-compose logs -f web
    else
        log_error "실행 중인 웹서버가 없습니다."
    fi
}

build_image() {
    log_info "Docker 이미지 빌드 중..."
    
    ./scripts/build.sh
}

start_dev_mode() {
    log_info "개발 모드 시작 중..."
    echo ""
    log_blue "ℹ️  개발 모드 특징:"
    echo "  - Docker 이미지 빌드 불필요"
    echo "  - 소스 코드 실시간 반영"
    echo "  - 첫 실행 시 패키지 설치 (5-10분)"
    echo "  - Hot reload 지원"
    echo ""
    
    # 기존 프로덕션 컨테이너 확인
    if docker ps | grep -q "naver-crawler-web"; then
        log_warn "프로덕션 컨테이너가 실행 중입니다. 종료하시겠습니까? (y/N)"
        read -p "> " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            docker-compose down
        else
            log_error "개발 모드 시작 취소"
            return 1
        fi
    fi
    
    docker-compose -f docker-compose.dev.yml up -d
    
    if [ $? -eq 0 ]; then
        log_info "✅ 개발 모드 시작 완료!"
        echo ""
        log_blue "📝 로그 확인: 메뉴에서 5번 선택"
        log_blue "🌐 접속: http://localhost:3000 또는 http://[NAS-IP]:3000"
    else
        log_error "❌ 개발 모드 시작 실패!"
        return 1
    fi
}

stop_dev_mode() {
    log_info "개발 모드 종료 중..."
    
    docker-compose -f docker-compose.dev.yml down
    
    if [ $? -eq 0 ]; then
        log_info "✅ 개발 모드 종료 완료!"
    else
        log_error "❌ 개발 모드 종료 실패!"
        return 1
    fi
}

clean_data() {
    echo ""
    log_warn "⚠️  주의: 크롤링된 데이터를 정리합니다!"
    echo ""
    echo "정리 옵션:"
    echo "1) 크롤링 데이터만 삭제 (crawled_data/)"
    echo "2) 로그만 삭제 (logs/)"
    echo "3) 모두 삭제"
    echo "0) 취소"
    echo ""
    
    read -p "선택 (0-3): " clean_choice
    
    case $clean_choice in
        1)
            read -p "크롤링 데이터를 삭제하시겠습니까? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                rm -rf crawled_data/*
                log_info "✅ 크롤링 데이터 삭제 완료"
            fi
            ;;
        2)
            read -p "로그 파일을 삭제하시겠습니까? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                rm -rf logs/*
                log_info "✅ 로그 파일 삭제 완료"
            fi
            ;;
        3)
            read -p "모든 데이터를 삭제하시겠습니까? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                rm -rf crawled_data/* logs/*
                log_info "✅ 모든 데이터 삭제 완료"
            fi
            ;;
        0)
            log_info "취소되었습니다."
            ;;
        *)
            log_error "잘못된 선택입니다."
            ;;
    esac
}

# 메인 루프
while true; do
    show_menu
    read -p "선택하세요: " choice
    echo ""
    
    case $choice in
        1)
            start_server
            ;;
        2)
            stop_server
            ;;
        3)
            restart_server
            ;;
        4)
            check_status
            ;;
        5)
            view_logs
            ;;
        6)
            build_image
            ;;
        7)
            clean_data
            ;;
        8)
            start_dev_mode
            ;;
        9)
            stop_dev_mode
            ;;
        0)
            log_info "프로그램을 종료합니다."
            exit 0
            ;;
        *)
            log_error "잘못된 선택입니다."
            ;;
    esac
    
    echo ""
    read -p "계속하려면 Enter를 누르세요..."
done

