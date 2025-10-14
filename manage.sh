#!/bin/bash
# 웹서버 관리 스크립트 v2.0

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
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

log_cyan() {
    echo -e "${CYAN}$1${NC}"
}

# 현재 실행 중인 컨테이너 이름 확인
get_running_container() {
    if docker ps --format "{{.Names}}" | grep -q "^naver-crawler-web$"; then
        echo "naver-crawler-web"
    elif docker ps --format "{{.Names}}" | grep -q "naver-crawler-web-dev"; then
        echo "naver-crawler-web-dev"
    else
        echo ""
    fi
}

# 현재 모드 확인
get_current_mode() {
    DOCKERFILE=$(grep "dockerfile:" docker-compose.yml | awk '{print $2}' | head -1)
    if [[ "$DOCKERFILE" == "Dockerfile.dev" ]]; then
        echo "dev"
    else
        echo "prod"
    fi
}

show_menu() {
    clear
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  네이버 부동산 크롤러 관리 메뉴 v2.0${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 현재 상태 표시
    CONTAINER=$(get_running_container)
    CURRENT_MODE=$(get_current_mode)

    if [ -n "$CONTAINER" ]; then
        echo -e "${GREEN}● 상태: 실행 중${NC}"
        echo -e "  컨테이너: ${CYAN}$CONTAINER${NC}"
        if [[ "$CURRENT_MODE" == "dev" ]]; then
            echo -e "  모드: ${BLUE}🔧 개발 모드 (Hot Reload)${NC}"
        else
            echo -e "  모드: ${GREEN}🚀 프로덕션 모드${NC}"
        fi
    else
        echo -e "${YELLOW}○ 상태: 중지됨${NC}"
        if [[ "$CURRENT_MODE" == "dev" ]]; then
            echo -e "  설정: ${BLUE}🔧 개발 모드${NC}"
        else
            echo -e "  설정: ${GREEN}🚀 프로덕션 모드${NC}"
        fi
    fi

    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo -e "${CYAN}=== 기본 제어 ===${NC}"
    echo "  1) 🚀 시작"
    echo "  2) 🛑 종료"
    echo "  3) 🔄 재시작"
    echo "  4) 📊 상태 확인 (상세)"
    echo "  5) 📝 로그 보기 (실시간)"
    echo ""

    echo -e "${CYAN}=== 모드 관리 ===${NC}"
    echo "  6) 🔀 모드 전환 (개발 ↔ 프로덕션)"
    echo "  7) ⚡ 프로덕션 속도 테스트"
    echo ""

    echo -e "${CYAN}=== 빌드 & 관리 ===${NC}"
    echo "  8) 🔧 빌드 (프로덕션)"
    echo "  9) 🗑️  데이터 정리"
    echo " 10) 🔍 Docker 정보"
    echo ""

    echo -e "${CYAN}=== 기타 ===${NC}"
    echo "  0) 🚪 종료"
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

start_server() {
    log_info "서버 시작 중..."
    echo ""

    CURRENT_MODE=$(get_current_mode)

    if [[ "$CURRENT_MODE" == "dev" ]]; then
        log_blue "🔧 개발 모드로 시작합니다."
        echo "  - Hot Reload 활성화"
        echo "  - 빌드 불필요"
        echo "  - 첫 실행 시 npm install (5-10분)"
    else
        log_blue "🚀 프로덕션 모드로 시작합니다."
        echo "  - 최적화된 성능"
        echo "  - 사전 빌드 필요"
    fi

    echo ""
    docker-compose up -d

    if [ $? -eq 0 ]; then
        log_info "✅ 서버 시작 완료!"
        echo ""
        log_cyan "🌐 웹 UI: http://localhost:3000"
        if [[ "$CURRENT_MODE" == "dev" ]]; then
            echo ""
            log_blue "💡 Hot Reload: 코드 수정 시 자동 반영 (3-5초)"
        fi
    else
        log_error "❌ 서버 시작 실패!"
        return 1
    fi
}

stop_server() {
    log_info "서버 종료 중..."

    docker-compose down

    if [ $? -eq 0 ]; then
        log_info "✅ 서버 종료 완료!"
    else
        log_error "❌ 서버 종료 실패!"
        return 1
    fi
}

restart_server() {
    log_info "서버 재시작 중..."

    docker-compose restart

    if [ $? -eq 0 ]; then
        log_info "✅ 서버 재시작 완료!"
    else
        log_error "❌ 서버 재시작 실패!"
        return 1
    fi
}

check_status() {
    log_info "시스템 상태 확인 중..."
    echo ""

    CONTAINER=$(get_running_container)
    CURRENT_MODE=$(get_current_mode)

    if [ -n "$CONTAINER" ]; then
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  실행 중${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        if [[ "$CURRENT_MODE" == "dev" ]]; then
            echo -e "모드: ${BLUE}🔧 개발 모드 (Hot Reload)${NC}"
            echo "  - Dockerfile: Dockerfile.dev"
            echo "  - 명령어: npm run dev"
            echo "  - Hot Reload: 활성화"
        else
            echo -e "모드: ${GREEN}🚀 프로덕션 모드${NC}"
            echo "  - Dockerfile: Dockerfile"
            echo "  - 명령어: npm start"
            echo "  - 최적화: 활성화"
        fi

        echo ""
        echo -e "${CYAN}=== 컨테이너 상태 ===${NC}"
        docker-compose ps

        echo ""
        echo -e "${CYAN}=== 리소스 사용량 ===${NC}"
        docker stats --no-stream $CONTAINER naver-crawler-db 2>/dev/null || true

        echo ""
        echo -e "${CYAN}=== 헬스체크 ===${NC}"
        HEALTH=$(docker inspect $CONTAINER --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        if [[ "$HEALTH" == "healthy" ]]; then
            echo -e "상태: ${GREEN}✅ Healthy${NC}"
        elif [[ "$HEALTH" == "unhealthy" ]]; then
            echo -e "상태: ${RED}❌ Unhealthy${NC}"
        else
            echo -e "상태: ${YELLOW}⏳ Starting...${NC}"
        fi
    else
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}  중지됨${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        if [[ "$CURRENT_MODE" == "dev" ]]; then
            echo -e "설정: ${BLUE}🔧 개발 모드${NC}"
        else
            echo -e "설정: ${GREEN}🚀 프로덕션 모드${NC}"
        fi
        echo ""
        log_warn "서버가 실행 중이 아닙니다."
        echo ""
        log_cyan "💡 '1) 시작'을 선택하여 서버를 시작하세요."
    fi

    echo ""
    echo -e "${CYAN}=== 크롤링 데이터 ===${NC}"
    FILE_COUNT=$(ls -1 crawled_data/*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "크롤링된 파일: ${FILE_COUNT}개"

    if [ $FILE_COUNT -gt 0 ]; then
        echo ""
        echo "최신 3개 파일:"
        ls -lht crawled_data/*.json 2>/dev/null | head -3 | awk '{print "  " $9 " (" $5 ")"}'
    fi

    echo ""
    echo -e "${CYAN}=== 데이터베이스 ===${NC}"
    if docker ps --format "{{.Names}}" | grep -q "naver-crawler-db"; then
        echo -e "PostgreSQL: ${GREEN}✅ 실행 중${NC}"
    else
        echo -e "PostgreSQL: ${RED}❌ 중지됨${NC}"
    fi

    echo ""
}

view_logs() {
    log_info "로그 확인 중..."
    echo ""

    CONTAINER=$(get_running_container)

    if [ -z "$CONTAINER" ]; then
        log_error "실행 중인 서버가 없습니다."
        return 1
    fi

    CURRENT_MODE=$(get_current_mode)

    if [[ "$CURRENT_MODE" == "dev" ]]; then
        log_blue "🔧 개발 모드 로그 (Ctrl+C로 종료)"
        echo "  - Hot Reload 활성화"
        echo "  - 실시간 로그 스트리밍"
    else
        log_blue "🚀 프로덕션 모드 로그 (Ctrl+C로 종료)"
        echo "  - 최적화된 빌드"
    fi

    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    sleep 2

    # 실제 컨테이너 이름 사용
    docker logs $CONTAINER -f --tail=100
}

switch_mode() {
    ./scripts/switch-mode.sh
}

test_production() {
    echo ""
    log_warn "프로덕션 모드 속도 테스트를 시작합니다."
    echo ""
    echo -e "${YELLOW}⏱️  예상 소요 시간: 20-40분${NC}"
    echo "  - 빌드: 15-30분"
    echo "  - 테스트: 5-10분"
    echo ""
    read -p "계속하시겠습니까? (y/N): " confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "취소되었습니다."
        return 0
    fi

    ./scripts/test-production.sh
}

build_image() {
    log_info "프로덕션 이미지 빌드 중..."
    echo ""
    log_warn "⏱️  NAS에서 15-30분 소요될 수 있습니다."
    echo ""

    docker-compose build --no-cache web

    if [ $? -eq 0 ]; then
        log_info "✅ 빌드 완료!"
    else
        log_error "❌ 빌드 실패!"
        return 1
    fi
}

clean_data() {
    echo ""
    log_warn "⚠️  주의: 데이터를 정리합니다!"
    echo ""
    echo "정리 옵션:"
    echo "  1) 크롤링 데이터만 삭제 (crawled_data/*.json)"
    echo "  2) 로그만 삭제 (logs/)"
    echo "  3) 모두 삭제"
    echo "  4) favorites.json 백업 후 삭제"
    echo "  0) 취소"
    echo ""

    read -p "선택 (0-4): " clean_choice

    case $clean_choice in
        1)
            read -p "크롤링 데이터를 삭제하시겠습니까? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                rm -rf crawled_data/*.json crawled_data/*.csv
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
                rm -rf crawled_data/*.json crawled_data/*.csv logs/*
                log_info "✅ 모든 데이터 삭제 완료"
            fi
            ;;
        4)
            if [ -f "crawled_data/favorites.json" ]; then
                cp crawled_data/favorites.json crawled_data/favorites.json.backup
                log_info "✅ favorites.json 백업 완료"
                read -p "백업 후 삭제하시겠습니까? (y/N): " confirm
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    rm -f crawled_data/favorites.json
                    log_info "✅ favorites.json 삭제 완료"
                    log_cyan "복원: cp crawled_data/favorites.json.backup crawled_data/favorites.json"
                fi
            else
                log_warn "favorites.json 파일이 없습니다."
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

show_docker_info() {
    log_info "Docker 정보 확인 중..."
    echo ""

    echo -e "${CYAN}=== Docker 버전 ===${NC}"
    docker --version
    docker-compose --version

    echo ""
    echo -e "${CYAN}=== 네트워크 ===${NC}"
    docker network ls | grep crawler || echo "  네트워크 없음"

    echo ""
    echo -e "${CYAN}=== 볼륨 ===${NC}"
    docker volume ls | grep crawler || echo "  볼륨 없음"

    echo ""
    echo -e "${CYAN}=== 이미지 ===${NC}"
    docker images | grep -E "naver-crawler|REPOSITORY"

    echo ""
    echo -e "${CYAN}=== 전체 컨테이너 ===${NC}"
    docker ps -a | grep -E "naver-crawler|CONTAINER"

    echo ""
    echo -e "${CYAN}=== 디스크 사용량 ===${NC}"
    docker system df

    echo ""
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
            switch_mode
            ;;
        7)
            test_production
            ;;
        8)
            build_image
            ;;
        9)
            clean_data
            ;;
        10)
            show_docker_info
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
