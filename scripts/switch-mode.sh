#!/bin/bash
# 개발 모드 ↔ 프로덕션 모드 전환 스크립트

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# 환경 감지 (프로덕션 vs 테스트)
detect_environment() {
    if [ -f "docker-compose.test.yml" ] && docker ps --format "{{.Names}}" | grep -q "test"; then
        echo "test"
    else
        echo "prod"
    fi
}

# 현재 모드 확인
get_current_mode() {
    ENV=$(detect_environment)

    # 환경에 맞는 compose 파일 선택
    if [[ "$ENV" == "test" ]]; then
        COMPOSE_FILE="docker-compose.test.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi

    # compose 파일에서 dockerfile 확인
    if [[ -f "$COMPOSE_FILE" ]]; then
        DOCKERFILE=$(grep "dockerfile:" "$COMPOSE_FILE" | awk '{print $2}' | head -1)
        if [[ "$DOCKERFILE" == "Dockerfile.dev" ]]; then
            echo "dev"
        else
            echo "prod"
        fi
    else
        echo "prod"
    fi
}

# 현재 모드
CURRENT_MODE=$(get_current_mode)

clear
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  모드 전환${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [[ "$CURRENT_MODE" == "dev" ]]; then
    echo -e "현재 모드: ${BLUE}🔧 개발 모드 (Hot Reload)${NC}"
    echo ""
    echo -e "${YELLOW}프로덕션 모드로 전환하시겠습니까?${NC}"
    echo ""
    echo "프로덕션 모드:"
    echo "  ✓ 최적화된 빌드 (속도 향상)"
    echo "  ✓ 메모리 사용량 감소"
    echo "  ✓ 안정적인 운영"
    echo "  ✗ Hot Reload 비활성화"
    echo "  ✗ 빌드 시간 소요 (15-30분)"
    echo ""

    NEW_MODE="prod"
    NEW_DOCKERFILE="Dockerfile"
    NEW_NODE_ENV="production"
else
    echo -e "현재 모드: ${GREEN}🚀 프로덕션 모드${NC}"
    echo ""
    echo -e "${YELLOW}개발 모드로 전환하시겠습니까?${NC}"
    echo ""
    echo "개발 모드:"
    echo "  ✓ Hot Reload 활성화 (코드 수정 즉시 반영)"
    echo "  ✓ 빌드 불필요"
    echo "  ✓ 개발 편의성 향상"
    echo "  ✗ 메모리 사용량 증가"
    echo "  ✗ 초기 시작 시간 증가"
    echo ""

    NEW_MODE="dev"
    NEW_DOCKERFILE="Dockerfile.dev"
    NEW_NODE_ENV="development"
fi

read -p "계속하시겠습니까? (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log_info "취소되었습니다."
    exit 0
fi

echo ""
log_info "모드 전환 중..."
echo ""

# 1. 서버 중지
log_blue "1️⃣  서버 중지 중..."

# 현재 실행 중인 모든 compose 파일의 컨테이너 중지
docker-compose -f docker-compose.yml down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
docker-compose -f docker-compose.test.yml down 2>/dev/null || true

log_info "✅ 서버 중지 완료"

echo ""

# 2. docker-compose 파일 전환
log_blue "2️⃣  docker-compose 파일 수정 중..."

ENV=$(detect_environment)

# 환경에 맞는 compose 파일 선택
if [[ "$ENV" == "test" ]]; then
    COMPOSE_FILE="docker-compose.test.yml"
    log_info "✅ 테스트 환경 설정 파일 사용: $COMPOSE_FILE"
else
    COMPOSE_FILE="docker-compose.yml"
    log_info "✅ 프로덕션 환경 설정 파일 사용: $COMPOSE_FILE"
fi

# Dockerfile 변경
sed -i "s/dockerfile: Dockerfile.*/dockerfile: $NEW_DOCKERFILE/" "$COMPOSE_FILE"
log_info "✅ Dockerfile 변경: $NEW_DOCKERFILE"

echo ""

# 3. 프로덕션 모드인 경우 빌드 필요 알림
if [[ "$NEW_MODE" == "prod" ]]; then
    log_warn "⚠️  프로덕션 모드로 전환하려면 빌드가 필요합니다."
    echo ""
    echo "다음 중 하나를 선택하세요:"
    echo "  1) 지금 빌드하기 (15-30분 소요)"
    echo "  2) 나중에 빌드하기 (메인 메뉴 '8) 빌드' 사용)"
    echo ""

    read -p "선택 (1-2): " build_choice

    if [[ "$build_choice" == "1" ]]; then
        echo ""
        log_blue "3️⃣  프로덕션 이미지 빌드 중... (15-30분 소요)"
        echo ""

        docker-compose -f $COMPOSE_FILE build --no-cache web

        if [ $? -eq 0 ]; then
            log_info "✅ 빌드 완료!"
            echo ""

            # 빌드 완료 후 서버 시작 제안
            read -p "서버를 시작하시겠습니까? (y/N): " start_confirm

            if [[ "$start_confirm" =~ ^[Yy]$ ]]; then
                log_blue "4️⃣  서버 시작 중..."
                docker-compose -f $COMPOSE_FILE up -d

                if [ $? -eq 0 ]; then
                    log_info "✅ 서버 시작 완료!"
                    echo ""
                    if [[ "$ENV" == "test" ]]; then
                        echo -e "${CYAN}🌐 웹 UI: http://localhost:3001 (테스트 환경)${NC}"
                    else
                        echo -e "${CYAN}🌐 웹 UI: http://localhost:3000${NC}"
                    fi
                else
                    log_error "❌ 서버 시작 실패!"
                fi
            fi
        else
            log_error "❌ 빌드 실패!"
            exit 1
        fi
    else
        log_info "나중에 '메인 메뉴 > 8) 빌드'로 빌드하세요."
    fi
else
    # 개발 모드로 전환 시 바로 시작 가능
    log_blue "3️⃣  서버 시작 중..."
    docker-compose -f $COMPOSE_FILE up -d

    if [ $? -eq 0 ]; then
        log_info "✅ 서버 시작 완료!"
        echo ""
        if [[ "$ENV" == "test" ]]; then
            echo -e "${CYAN}🌐 웹 UI: http://localhost:3001 (테스트 환경)${NC}"
        else
            echo -e "${CYAN}🌐 웹 UI: http://localhost:3000${NC}"
        fi
        echo -e "${BLUE}💡 Hot Reload: 코드 수정 시 자동 반영 (3-5초)${NC}"
    else
        log_error "❌ 서버 시작 실패!"
        exit 1
    fi
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "✅ 모드 전환 완료!"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
