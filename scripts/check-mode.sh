#!/bin/bash
# =============================================================================
# 현재 모드 확인 및 수정 스크립트
# =============================================================================
# 사용법:
#   ./scripts/check-mode.sh           # 현재 모드만 확인
#   ./scripts/check-mode.sh --fix     # 모드 확인 후 수정 옵션 제공
#
# 기능:
#   - 현재 실행 중인 모드 정확히 확인 (NODE_ENV 기반)
#   - 예상과 다른 경우 즉시 수정 가능
#   - 컨테이너 상태, 환경 변수, Compose 파일 확인
# =============================================================================

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${MAGENTA}${BOLD}$1${NC}"
}

# 현재 실행 중인 모드 감지
detect_current_mode() {
    # 실행 중인 웹 컨테이너가 있는지 확인
    if ! docker ps --filter "name=naver-crawler-web" --filter "status=running" | grep -q "naver-crawler-web"; then
        echo "none"
        return
    fi

    # 컨테이너 내부 NODE_ENV 확인 (가장 정확한 방법)
    NODE_ENV=$(docker exec naver-crawler-web env 2>/dev/null | grep "^NODE_ENV=" | cut -d'=' -f2 | tr -d '\r')

    if [ "$NODE_ENV" = "production" ]; then
        echo "prod"
    elif [ "$NODE_ENV" = "development" ]; then
        echo "dev"
    else
        # NODE_ENV가 없거나 다른 값이면 docker-compose.yml 기본 사용 (개발 모드)
        echo "dev"
    fi
}

# 상세 정보 수집
get_detailed_info() {
    local mode=$1
    local info=""

    # 컨테이너 상태
    CONTAINER_STATUS=$(docker ps --filter "name=naver-crawler-web" --format "{{.Status}}" 2>/dev/null || echo "Not running")

    # NODE_ENV
    NODE_ENV=$(docker exec naver-crawler-web env 2>/dev/null | grep "^NODE_ENV=" | cut -d'=' -f2 | tr -d '\r' || echo "N/A")

    # 이미지 정보
    IMAGE_NAME=$(docker ps --filter "name=naver-crawler-web" --format "{{.Image}}" 2>/dev/null || echo "N/A")

    # 볼륨 마운트 (소스 코드 볼륨이 있는지 확인)
    VOLUME_COUNT=$(docker inspect naver-crawler-web 2>/dev/null | grep -c "\"Source\"" || echo "0")

    # 포트
    PORT=$(docker ps --filter "name=naver-crawler-web" --format "{{.Ports}}" 2>/dev/null || echo "N/A")

    echo "$CONTAINER_STATUS|$NODE_ENV|$IMAGE_NAME|$VOLUME_COUNT|$PORT"
}

# 메인 화면 출력
show_current_status() {
    clear
    echo ""
    log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_header "  현재 모드 확인 v1.0"
    log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    CURRENT_MODE=$(detect_current_mode)

    if [ "$CURRENT_MODE" = "none" ]; then
        log_warn "실행 중인 컨테이너가 없습니다"
        echo ""
        echo "💡 서버를 시작하려면:"
        echo "   - manage.sh 실행 → 옵션 1 (시작)"
        echo "   - 또는: ./deploy-to-nas.sh dev"
        echo ""
        return 1
    fi

    # 상세 정보 가져오기
    IFS='|' read -r CONTAINER_STATUS NODE_ENV IMAGE_NAME VOLUME_COUNT PORT <<< "$(get_detailed_info "$CURRENT_MODE")"

    # 현재 모드 표시
    if [ "$CURRENT_MODE" = "dev" ]; then
        echo -e "${BLUE}${BOLD}🔧 개발 모드 (Development Mode)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "  ${GREEN}●${NC} 상태: ${GREEN}실행 중${NC}"
        echo -e "  📝 NODE_ENV: ${CYAN}$NODE_ENV${NC}"
        echo -e "  📦 Compose: ${CYAN}docker-compose.yml${NC}"
        echo -e "  🔥 Hot Reload: ${GREEN}활성화${NC}"
        echo -e "  🏗️  빌드: ${BLUE}불필요 (소스 직접 마운트)${NC}"
        echo ""
        echo -e "  ${BOLD}특징:${NC}"
        echo -e "    ✓ 코드 수정 시 즉시 반영 (3초)"
        echo -e "    ✓ 개발 도구 포함"
        echo -e "    ✓ 상세한 에러 메시지"
        echo ""
    elif [ "$CURRENT_MODE" = "prod" ]; then
        echo -e "${GREEN}${BOLD}🚀 프로덕션 모드 (Production Mode)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "  ${GREEN}●${NC} 상태: ${GREEN}실행 중${NC}"
        echo -e "  📝 NODE_ENV: ${CYAN}$NODE_ENV${NC}"
        echo -e "  📦 Compose: ${CYAN}docker-compose.prod.yml${NC}"
        echo -e "  🔥 Hot Reload: ${YELLOW}비활성화${NC}"
        echo -e "  🏗️  빌드: ${GREEN}최적화 완료${NC}"
        echo ""
        echo -e "  ${BOLD}특징:${NC}"
        echo -e "    ✓ Next.js 최적화 빌드"
        echo -e "    ✓ 메모리 사용량 30% 감소"
        echo -e "    ✓ 안정적인 운영"
        echo ""
    fi

    # 추가 정보
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}상세 정보:${NC}"
    echo ""
    echo -e "  🐳 컨테이너: ${CYAN}naver-crawler-web${NC}"
    echo -e "  📊 상태: ${CYAN}$CONTAINER_STATUS${NC}"
    echo -e "  🖼️  이미지: ${CYAN}$IMAGE_NAME${NC}"
    echo -e "  📂 볼륨: ${CYAN}$VOLUME_COUNT개${NC}"
    echo -e "  🌐 포트: ${CYAN}$PORT${NC}"
    echo ""

    return 0
}

# 모드 수정 제안
suggest_fix() {
    CURRENT_MODE=$(detect_current_mode)

    if [ "$CURRENT_MODE" = "none" ]; then
        return 0
    fi

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "💡 현재 모드가 예상과 다른가요?"
    echo ""
    echo "다음 중 선택하세요:"
    echo ""

    if [ "$CURRENT_MODE" = "dev" ]; then
        echo "  1) 프로덕션 모드로 전환"
        echo "  2) 개발 모드 재시작 (문제 해결)"
    else
        echo "  1) 개발 모드로 전환"
        echo "  2) 프로덕션 모드 재시작 (문제 해결)"
    fi

    echo "  0) 아니요, 현재 상태 유지"
    echo ""
    read -p "선택 (0-2): " fix_choice

    case $fix_choice in
        1)
            echo ""
            log_info "모드 전환 스크립트를 실행합니다..."
            echo ""
            ./scripts/switch-mode-safe.sh
            ;;
        2)
            echo ""
            log_info "현재 모드로 재시작합니다..."
            echo ""
            if [ "$CURRENT_MODE" = "dev" ]; then
                docker-compose restart web
                log_success "개발 모드 재시작 완료!"
            else
                docker-compose -f docker-compose.prod.yml restart web
                log_success "프로덕션 모드 재시작 완료!"
            fi
            ;;
        0)
            log_info "현재 상태를 유지합니다."
            ;;
        *)
            log_error "잘못된 선택입니다."
            ;;
    esac
}

# 메인 실행
main() {
    show_current_status
    STATUS_RESULT=$?

    if [ "$STATUS_RESULT" -ne 0 ]; then
        # 컨테이너가 없으면 종료
        exit 1
    fi

    # --fix 옵션이 있으면 수정 제안
    if [ "$1" = "--fix" ] || [ "$1" = "-f" ]; then
        suggest_fix
    else
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "💡 모드를 변경하려면:"
        echo "   ${CYAN}./scripts/check-mode.sh --fix${NC}"
        echo ""
        echo "또는:"
        echo "   ${CYAN}./manage.sh${NC} → 옵션 7 (모드 전환)"
        echo ""
    fi
}

# 스크립트 실행
main "$@"
