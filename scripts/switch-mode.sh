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

# 현재 모드 확인
get_current_mode() {
    DOCKERFILE=$(grep "dockerfile:" docker-compose.yml | awk '{print $2}' | head -1)
    if [[ "$DOCKERFILE" == "Dockerfile.dev" ]]; then
        echo "dev"
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
docker-compose down

if [ $? -ne 0 ]; then
    log_error "서버 중지 실패!"
    exit 1
fi

echo ""

# 2. docker-compose.yml 수정
log_blue "2️⃣  docker-compose.yml 수정 중..."

# Dockerfile 변경
sed -i.bak "s|dockerfile:.*|dockerfile: $NEW_DOCKERFILE  # Mode: $NEW_MODE|" docker-compose.yml

# NODE_ENV 변경
sed -i.bak "s|NODE_ENV=.*|NODE_ENV=$NEW_NODE_ENV|" docker-compose.yml

# 백업 파일 삭제
rm -f docker-compose.yml.bak

log_info "✅ docker-compose.yml 업데이트 완료"
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

        docker-compose build --no-cache web

        if [ $? -eq 0 ]; then
            log_info "✅ 빌드 완료!"
            echo ""

            # 빌드 완료 후 서버 시작 제안
            read -p "서버를 시작하시겠습니까? (y/N): " start_confirm

            if [[ "$start_confirm" =~ ^[Yy]$ ]]; then
                log_blue "4️⃣  서버 시작 중..."
                docker-compose up -d

                if [ $? -eq 0 ]; then
                    log_info "✅ 서버 시작 완료!"
                    echo ""
                    log_cyan "🌐 웹 UI: http://localhost:3000"
                else
                    log_error "❌ 서버 시작 실패!"
                fi
            fi
        else
            log_error "❌ 빌드 실패!"
            echo ""
            log_warn "개발 모드로 되돌리시겠습니까?"
            read -p "(y/N): " revert_confirm

            if [[ "$revert_confirm" =~ ^[Yy]$ ]]; then
                sed -i.bak "s|dockerfile:.*|dockerfile: Dockerfile.dev  # Mode: dev|" docker-compose.yml
                sed -i.bak "s|NODE_ENV=.*|NODE_ENV=development|" docker-compose.yml
                rm -f docker-compose.yml.bak
                log_info "개발 모드로 되돌렸습니다."
            fi
            exit 1
        fi
    else
        log_info "나중에 '메인 메뉴 > 8) 빌드'로 빌드하세요."
    fi
else
    # 개발 모드로 전환 시 바로 시작 가능
    log_blue "3️⃣  서버 시작 중..."
    docker-compose up -d

    if [ $? -eq 0 ]; then
        log_info "✅ 서버 시작 완료!"
        echo ""
        log_cyan "🌐 웹 UI: http://localhost:3000"
        log_blue "💡 Hot Reload: 코드 수정 시 자동 반영 (3-5초)"
    else
        log_error "❌ 서버 시작 실패!"
        exit 1
    fi
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "✅ 모드 전환 완료!"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
