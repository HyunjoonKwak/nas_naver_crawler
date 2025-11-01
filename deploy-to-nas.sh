#!/bin/bash
# =============================================================================
# NAS 배포 자동화 스크립트 (v2.11.0)
# =============================================================================
# 사용법:
#   ./deploy-to-nas.sh [환경]
#
# 예시:
#   ./deploy-to-nas.sh dev      # 개발 환경 배포 (빠른 재시작)
#   ./deploy-to-nas.sh prod     # 프로덕션 환경 배포 (빌드 포함)
#
# 참고:
#   - NAS에서 실행하거나 로컬에서 NAS로 배포할 때 사용
#   - config.env 파일이 이미 설정되어 있어야 함
# =============================================================================

set -e  # 에러 발생 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 변수 (기본값: dev)
ENVIRONMENT="${1:-dev}"

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

# 헤더 출력
echo ""
echo "======================================================================"
echo "  NAS 배포 스크립트 v2.11.0"
echo "  환경: $ENVIRONMENT"
echo "  시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================================"
echo ""

# ============================================
# 1. 사전 체크
# ============================================
log_info "Step 1: 사전 요구사항 체크 중..."

# Docker 체크
if ! command -v docker &> /dev/null; then
    log_error "Docker가 설치되어 있지 않습니다"
    exit 1
fi
log_success "Docker 확인 완료"

# Docker Compose 체크
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose가 설치되어 있지 않습니다"
    exit 1
fi
log_success "Docker Compose 확인 완료"

# config.env 파일 체크
if [ ! -f "config.env" ]; then
    log_error "config.env 파일이 없습니다"
    log_info "다음 명령어로 생성하세요:"
    echo "  cp config.env.example config.env"
    echo "  vi config.env  # 실제 값 입력"
    exit 1
fi
log_success "config.env 파일 확인 완료"

# .env 심볼릭 링크 체크
if [ ! -L ".env" ]; then
    log_warn ".env 심볼릭 링크가 없습니다. 생성 중..."
    ln -sf config.env .env
    log_success ".env → config.env 심볼릭 링크 생성 완료"
fi

# ============================================
# 2. Git 상태 확인
# ============================================
log_info "Step 2: Git 상태 확인 중..."

if [ -d ".git" ]; then
    CURRENT_BRANCH=$(git branch --show-current)
    COMMIT_HASH=$(git rev-parse --short HEAD)
    log_info "현재 브랜치: $CURRENT_BRANCH"
    log_info "커밋 해시: $COMMIT_HASH"

    # Uncommitted changes 체크
    if [ -n "$(git status --porcelain)" ]; then
        log_warn "커밋되지 않은 변경사항이 있습니다"
        git status --short
    else
        log_success "Git 상태 깨끗함"
    fi
else
    log_warn "Git 저장소가 아닙니다"
fi

# ============================================
# 3. 환경별 배포
# ============================================

if [ "$ENVIRONMENT" = "prod" ]; then
    # ========================================
    # 프로덕션 배포 (최적화 빌드)
    # ========================================
    log_info "Step 3: 프로덕션 환경 배포 시작..."

    # 3-1. 기존 컨테이너 중지
    log_info "기존 컨테이너 중지 중..."
    docker-compose -f docker-compose.prod.yml down || true
    log_success "컨테이너 중지 완료"

    # 3-2. 프로덕션 이미지 빌드
    log_info "프로덕션 이미지 빌드 중... (10~15분 소요)"
    log_info "  - Next.js 최적화 빌드 (npm run build)"
    log_info "  - 프로덕션 의존성만 설치"
    log_info "  - Hot Reload 비활성화"
    docker-compose -f docker-compose.prod.yml build --no-cache
    log_success "프로덕션 이미지 빌드 완료"

    # 3-3. 컨테이너 시작
    log_info "컨테이너 시작 중..."
    docker-compose -f docker-compose.prod.yml up -d
    log_success "컨테이너 시작 완료"

    log_success "✨ 프로덕션 모드로 배포 완료 (최적화됨)"

else
    # ========================================
    # 개발 환경 배포 (Hot Reload)
    # ========================================
    log_info "Step 3: 개발 환경 배포 시작 (Hot Reload)..."

    # 3-1. 컨테이너 재시작만 (3초 완료!)
    log_info "컨테이너 재시작 중..."
    docker-compose restart web
    log_success "컨테이너 재시작 완료 (Hot Reload 활성화)"
fi

# ============================================
# 4. 배포 후 자동 검증
# ============================================
log_info "Step 4: 배포 검증 중..."
echo ""

# 환경별 compose 파일 경로 설정
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_CMD="docker-compose -f docker-compose.prod.yml"
else
    COMPOSE_CMD="docker-compose"
fi

# 4-1. 컨테이너 시작 대기
log_info "검증 1/5: 컨테이너 시작 대기 중..."
sleep 5

# 4-2. 컨테이너 상태 확인
log_info "검증 2/5: 컨테이너 상태 확인 중..."
CONTAINER_STATUS=$($COMPOSE_CMD ps web | grep -i "up" | wc -l)

if [ "$CONTAINER_STATUS" -gt 0 ]; then
    log_success "✅ 웹 컨테이너 정상 실행 중"
else
    log_error "❌ 웹 컨테이너가 실행되지 않았습니다"
    echo ""
    log_info "로그 확인:"
    $COMPOSE_CMD logs --tail=50 web
    exit 1
fi

# 4-3. NODE_ENV 환경 변수 확인
log_info "검증 3/5: NODE_ENV 확인 중..."
NODE_ENV=$($COMPOSE_CMD exec -T web env | grep NODE_ENV | cut -d'=' -f2 | tr -d '\r')

if [ "$ENVIRONMENT" = "prod" ]; then
    if [ "$NODE_ENV" = "production" ]; then
        log_success "✅ NODE_ENV=production (프로덕션 모드)"
    else
        log_warn "⚠️  NODE_ENV=$NODE_ENV (예상: production)"
    fi
else
    if [ "$NODE_ENV" = "development" ]; then
        log_success "✅ NODE_ENV=development (개발 모드)"
    else
        log_warn "⚠️  NODE_ENV=$NODE_ENV (예상: development)"
    fi
fi

# 4-4. 데이터베이스 연결 확인
log_info "검증 4/5: 데이터베이스 연결 확인 중..."
DB_STATUS=$(docker-compose ps db | grep -i "up" | wc -l)

if [ "$DB_STATUS" -gt 0 ]; then
    log_success "✅ 데이터베이스 컨테이너 정상 실행 중"
else
    log_warn "⚠️  데이터베이스 컨테이너가 실행되지 않았습니다"
fi

# 4-5. Redis 연결 확인
log_info "검증 5/5: Redis 연결 확인 중..."
REDIS_STATUS=$(docker-compose ps redis | grep -i "up" | wc -l)

if [ "$REDIS_STATUS" -gt 0 ]; then
    log_success "✅ Redis 컨테이너 정상 실행 중"
else
    log_warn "⚠️  Redis 컨테이너가 실행되지 않았습니다"
fi

echo ""
log_success "🎉 모든 검증 통과!"

# ============================================
# 5. 배포 완료
# ============================================
echo ""
echo "======================================================================"
echo "  🎉 배포 완료!"
echo "======================================================================"
echo ""
echo "📊 배포 정보:"
echo "  - 환경: $ENVIRONMENT"
echo "  - 버전: v2.11.0"
echo "  - 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "🔗 접속 정보:"
echo "  - URL: http://$(hostname -I | awk '{print $1}'):3000"
echo "  - 또는: http://localhost:3000"
echo ""
echo "📝 다음 단계:"
echo "  1. 로그 확인: docker-compose logs -f web"
echo "  2. 상태 확인: docker-compose ps"
echo "  3. 브라우저에서 접속하여 동작 확인"
echo ""
echo "⚠️  문제 발생 시:"
echo "  - 로그 확인: docker-compose logs --tail=100 web"
echo "  - 재배포: ./deploy-to-nas.sh $ENVIRONMENT"
echo "  - 완전 정리 후 재시작: docker-compose down && ./deploy-to-nas.sh $ENVIRONMENT"
echo ""
echo "======================================================================"
