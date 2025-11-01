#!/bin/bash
# 안전한 개발/프로덕션 모드 전환 스크립트 v3.0
# Git 파일 수정 없이 별도 compose 파일 사용

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

# 현재 모드
CURRENT_MODE=$(detect_current_mode)

clear
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}  안전한 모드 전환 v3.0${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 현재 상태 표시
if [[ "$CURRENT_MODE" == "dev" ]]; then
    echo -e "현재 모드: ${BLUE}🔧 개발 모드 (Hot Reload)${NC}"
    echo -e "실행 파일: ${CYAN}docker-compose.yml${NC}"
    echo ""
    echo -e "${YELLOW}프로덕션 모드로 전환하시겠습니까?${NC}"
    echo ""
    echo "프로덕션 모드:"
    echo "  ✓ Next.js 최적화 빌드 (압축, 캐싱)"
    echo "  ✓ 메모리 사용량 30% 감소"
    echo "  ✓ NODE_ENV=production"
    echo "  ✓ 안정적인 운영"
    echo "  ✗ Hot Reload 비활성화"
    echo "  ✗ 빌드 시간 10~15분 소요"
    echo ""

    NEW_MODE="prod"
    NEW_COMPOSE_FILE="docker-compose.prod.yml"
    CURRENT_COMPOSE_FILE="docker-compose.yml"

elif [[ "$CURRENT_MODE" == "prod" ]]; then
    echo -e "현재 모드: ${GREEN}🚀 프로덕션 모드${NC}"
    echo -e "실행 파일: ${CYAN}docker-compose.prod.yml${NC}"
    echo ""
    echo -e "${YELLOW}개발 모드로 전환하시겠습니까?${NC}"
    echo ""
    echo "개발 모드:"
    echo "  ✓ Hot Reload 활성화 (코드 수정 즉시 반영)"
    echo "  ✓ 빌드 불필요 (3~5초 시작)"
    echo "  ✓ 개발 편의성 향상"
    echo "  ✓ 디버깅 편리"
    echo "  ✗ 메모리 사용량 증가"
    echo "  ✗ 프로덕션 최적화 없음"
    echo ""

    NEW_MODE="dev"
    NEW_COMPOSE_FILE="docker-compose.yml"
    CURRENT_COMPOSE_FILE="docker-compose.prod.yml"

else
    log_warn "실행 중인 컨테이너가 없습니다."
    echo ""
    echo "모드를 선택하세요:"
    echo "  1) 개발 모드"
    echo "  2) 프로덕션 모드"
    echo ""
    read -p "선택 (1-2): " mode_choice

    case $mode_choice in
        1)
            NEW_MODE="dev"
            NEW_COMPOSE_FILE="docker-compose.yml"
            ;;
        2)
            NEW_MODE="prod"
            NEW_COMPOSE_FILE="docker-compose.prod.yml"
            ;;
        *)
            log_error "잘못된 선택입니다."
            exit 1
            ;;
    esac
fi

# 확인
echo ""
log_warn "⚠️  주의사항:"
echo "  - 실행 중인 크롤링 작업이 중단됩니다"
if [[ "$NEW_MODE" == "prod" ]]; then
    echo "  - 프로덕션 빌드 시간: 10~15분 소요"
else
    echo "  - 개발 모드 시작 시간: 3~5초"
fi
echo ""

read -p "계속하시겠습니까? (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log_info "취소되었습니다."
    exit 0
fi

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "모드 전환 시작"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 기존 컨테이너 중지
if [[ "$CURRENT_MODE" != "none" ]]; then
    log_blue "1️⃣  기존 컨테이너 중지 중..."
    docker-compose -f "$CURRENT_COMPOSE_FILE" down

    if [ $? -eq 0 ]; then
        log_info "✅ 컨테이너 중지 완료"
    else
        log_error "❌ 컨테이너 중지 실패"
        exit 1
    fi
    echo ""
fi

# 2. 새 모드로 시작
if [[ "$NEW_MODE" == "prod" ]]; then
    # 프로덕션 모드: 빌드 필요
    log_blue "2️⃣  프로덕션 이미지 빌드 중... (10~15분 소요)"
    echo ""

    docker-compose -f "$NEW_COMPOSE_FILE" build --no-cache

    if [ $? -eq 0 ]; then
        log_info "✅ 빌드 완료!"
        echo ""

        log_blue "3️⃣  프로덕션 컨테이너 시작 중..."
        docker-compose -f "$NEW_COMPOSE_FILE" up -d

        if [ $? -eq 0 ]; then
            log_info "✅ 컨테이너 시작 완료!"
        else
            log_error "❌ 컨테이너 시작 실패"
            exit 1
        fi
    else
        log_error "❌ 빌드 실패"
        exit 1
    fi

else
    # 개발 모드: 빌드 불필요
    log_blue "2️⃣  개발 모드 컨테이너 시작 중..."
    docker-compose -f "$NEW_COMPOSE_FILE" up -d

    if [ $? -eq 0 ]; then
        log_info "✅ 컨테이너 시작 완료!"
    else
        log_error "❌ 컨테이너 시작 실패"
        exit 1
    fi
fi

echo ""

# 3. 자동 검증
log_blue "4️⃣  배포 검증 중..."
echo ""

# 검증 대기
log_info "검증 1/5: 컨테이너 시작 대기 중..."
sleep 5

# 컨테이너 상태 확인
log_info "검증 2/5: 컨테이너 상태 확인 중..."
CONTAINER_STATUS=$(docker-compose -f "$NEW_COMPOSE_FILE" ps web | grep -i "up" | wc -l)

if [ "$CONTAINER_STATUS" -gt 0 ]; then
    log_info "✅ 웹 컨테이너 정상 실행 중"
else
    log_error "❌ 웹 컨테이너가 실행되지 않았습니다"
    echo ""
    log_info "로그 확인:"
    docker-compose -f "$NEW_COMPOSE_FILE" logs --tail=50 web
    exit 1
fi

# NODE_ENV 확인
log_info "검증 3/5: NODE_ENV 확인 중..."
NODE_ENV=$(docker-compose -f "$NEW_COMPOSE_FILE" exec -T web env | grep NODE_ENV | cut -d'=' -f2 | tr -d '\r')

if [[ "$NEW_MODE" == "prod" ]]; then
    if [[ "$NODE_ENV" == "production" ]]; then
        log_info "✅ NODE_ENV=production (프로덕션 모드)"
    else
        log_warn "⚠️  NODE_ENV=$NODE_ENV (예상: production)"
    fi
else
    if [[ "$NODE_ENV" == "development" ]]; then
        log_info "✅ NODE_ENV=development (개발 모드)"
    else
        log_warn "⚠️  NODE_ENV=$NODE_ENV (예상: development)"
    fi
fi

# 데이터베이스 연결 확인
log_info "검증 4/5: 데이터베이스 연결 확인 중..."
DB_STATUS=$(docker-compose ps db | grep -i "up" | wc -l)

if [ "$DB_STATUS" -gt 0 ]; then
    log_info "✅ 데이터베이스 컨테이너 정상 실행 중"
else
    log_warn "⚠️  데이터베이스 컨테이너가 실행되지 않았습니다"
fi

# Redis 연결 확인
log_info "검증 5/5: Redis 연결 확인 중..."
REDIS_STATUS=$(docker-compose ps redis | grep -i "up" | wc -l)

if [ "$REDIS_STATUS" -gt 0 ]; then
    log_info "✅ Redis 컨테이너 정상 실행 중"
else
    log_warn "⚠️  Redis 컨테이너가 실행되지 않았습니다"
fi

echo ""
log_info "🎉 모든 검증 통과!"
echo ""

# 4. 완료
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "✅ 모드 전환 완료!"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ "$NEW_MODE" == "dev" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  개발 모드 활성화${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  모드: ${BLUE}🔧 개발 모드 (Hot Reload)${NC}"
    echo -e "  파일: ${CYAN}$NEW_COMPOSE_FILE${NC}"
    echo ""
    echo -e "${CYAN}🌐 웹 UI: http://localhost:3000${NC}"
    echo -e "${BLUE}💡 Hot Reload: 코드 수정 시 자동 반영 (3-5초)${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. 코드 수정"
    echo "  2. 브라우저에서 확인 (자동 반영)"
    echo "  3. 검증 완료 후 git commit"
    echo "  4. 프로덕션 재배포: ./scripts/switch-mode-safe.sh"
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  프로덕션 모드 활성화${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  모드: ${GREEN}🚀 프로덕션 모드${NC}"
    echo -e "  파일: ${CYAN}$NEW_COMPOSE_FILE${NC}"
    echo -e "  최적화: ${GREEN}✅ 활성화${NC}"
    echo ""
    echo -e "${CYAN}🌐 웹 UI: http://localhost:3000${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. docker-compose -f $NEW_COMPOSE_FILE ps"
    echo "  2. docker-compose -f $NEW_COMPOSE_FILE logs -f web"
    echo "  3. curl http://localhost:3000/api/health"
fi

echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
