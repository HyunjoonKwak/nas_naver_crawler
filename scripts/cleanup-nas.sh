#!/bin/bash
# =============================================================================
# NAS 통합 정리 스크립트 v2.0
# =============================================================================
# 사용법:
#   ./scripts/cleanup-nas.sh           # 대화형 모드
#   ./scripts/cleanup-nas.sh --auto    # 자동 모드 (레벨 2 실행)
#   ./scripts/cleanup-nas.sh --level 3 # 특정 레벨 실행
#
# 기능:
#   - 프로젝트 폴더 정리 (.next, 백업 파일, 임시 파일)
#   - Docker 시스템 정리 (이미지, 컨테이너, 볼륨, 빌드 캐시)
#   - 시스템 로그 정리 (오래된 로그, 큰 로그)
#   - 디스크 사용량 분석 및 리포트
# =============================================================================

set -e

# 설정
DOCKER_ROOT="/volume1/docker"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="/tmp/cleanup-nas-$(date +%Y%m%d-%H%M%S).log"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    echo "[INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "[SUCCESS] $1" >> "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "[WARN] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "[ERROR] $1" >> "$LOG_FILE"
}

log_header() {
    echo -e "${MAGENTA}${BOLD}$1${NC}"
    echo "$1" >> "$LOG_FILE"
}

# 진행률 표시
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    echo -ne "${BLUE}[$current/$total]${NC} $message\r"
}

# 사용법 표시
show_usage() {
    cat << EOF
사용법:
  $0              # 대화형 모드 (권장)
  $0 --auto       # 자동 모드 (레벨 2 실행)
  $0 --level N    # 특정 레벨 실행 (1-3)
  $0 --help       # 도움말

정리 레벨:
  레벨 1 (안전)   - 프로젝트 파일 + Docker 안전 정리
  레벨 2 (일반)   - 레벨 1 + 미사용 이미지 + 임시 파일
  레벨 3 (전체)   - 레벨 2 + 볼륨 + 로그 + 빌드 캐시
EOF
    exit 0
}

# 헤더
show_header() {
    clear
    echo ""
    log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_header "  🧹 NAS 통합 정리 스크립트 v2.0"
    log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log_info "로그 파일: $LOG_FILE"
    echo ""
}

# 디스크 사용량 분석
analyze_disk() {
    log_header "📊 디스크 사용량 분석"
    echo ""

    # 전체 디스크 상태
    echo "  💾 전체 디스크 상태:"
    df -h | grep -E "Filesystem|/dev/md" | awk '{print "    " $0}'
    echo ""

    # Docker 상태
    if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
        echo "  🐳 Docker 시스템:"
        docker system df 2>/dev/null | awk '{print "    " $0}'
        echo ""

        RUNNING=$(docker ps -q 2>/dev/null | wc -l | xargs)
        STOPPED=$(docker ps -a -f status=exited -q 2>/dev/null | wc -l | xargs)
        IMAGES=$(docker images -q 2>/dev/null | wc -l | xargs)
        DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l | xargs)
        VOLUMES=$(docker volume ls -q 2>/dev/null | wc -l | xargs)

        echo "    실행 중인 컨테이너: ${RUNNING}개"
        echo "    중지된 컨테이너: ${STOPPED}개"
        echo "    전체 이미지: ${IMAGES}개"
        echo "    Dangling 이미지: ${DANGLING}개"
        echo "    볼륨: ${VOLUMES}개"
    else
        log_warn "Docker를 사용할 수 없습니다"
    fi
    echo ""

    # 프로젝트 폴더 상태
    echo "  📁 프로젝트 폴더: $PROJECT_ROOT"

    if [ -d "$PROJECT_ROOT/.next" ]; then
        NEXT_SIZE=$(du -sh "$PROJECT_ROOT/.next" 2>/dev/null | cut -f1 || echo "0B")
        echo "    .next/: $NEXT_SIZE"
    fi

    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        NODE_SIZE=$(du -sh "$PROJECT_ROOT/node_modules" 2>/dev/null | cut -f1 || echo "0B")
        echo "    node_modules/: $NODE_SIZE"
    fi

    BACKUP_COUNT=$(find "$PROJECT_ROOT" -maxdepth 1 \( -name "*.backup" -o -name "*_backup" \) 2>/dev/null | wc -l | xargs)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        echo "    백업 파일/폴더: ${BACKUP_COUNT}개"
    fi

    DS_STORE_COUNT=$(find "$PROJECT_ROOT" -name ".DS_Store" 2>/dev/null | wc -l | xargs)
    if [ "$DS_STORE_COUNT" -gt 0 ]; then
        echo "    .DS_Store: ${DS_STORE_COUNT}개"
    fi
    echo ""

    # Docker 루트 폴더 (NAS 전용)
    if [ -d "$DOCKER_ROOT" ]; then
        echo "  🗄️  Docker 루트: $DOCKER_ROOT"
        DOCKER_SIZE=$(du -sh "$DOCKER_ROOT" 2>/dev/null | cut -f1 || echo "0B")
        echo "    전체 크기: $DOCKER_SIZE"
        echo ""

        echo "    프로젝트별 사용량 Top 5:"
        du -sh "$DOCKER_ROOT"/*/ 2>/dev/null | sort -hr | head -5 | awk '{print "      " $2 ": " $1}'
        echo ""

        # 큰 로그 파일
        LARGE_LOGS=$(find "$DOCKER_ROOT" -name "*.log" -size +10M 2>/dev/null | wc -l | xargs)
        if [ "$LARGE_LOGS" -gt 0 ]; then
            echo "    큰 로그 파일 (10MB+): ${LARGE_LOGS}개"
        fi

        # 임시 파일
        TEMP_COUNT=$(find "$DOCKER_ROOT" -name "*.tmp" -o -name "*~" -o -name ".DS_Store" 2>/dev/null | wc -l | xargs)
        if [ "$TEMP_COUNT" -gt 0 ]; then
            echo "    임시 파일: ${TEMP_COUNT}개"
        fi
    fi
    echo ""
}

# 프로젝트 폴더 정리
cleanup_project() {
    local level=$1
    log_header "📦 프로젝트 폴더 정리 (레벨 $level)"
    echo ""

    cd "$PROJECT_ROOT"

    local cleaned=0

    # 빌드 캐시 (레벨 1+)
    if [ "$level" -ge 1 ]; then
        if [ -d ".next" ]; then
            NEXT_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "0B")
            rm -rf .next
            log_success "삭제: .next/ ($NEXT_SIZE)"
            ((cleaned++))
        fi

        if [ -f "tsconfig.tsbuildinfo" ]; then
            rm -f tsconfig.tsbuildinfo
            log_success "삭제: tsconfig.tsbuildinfo"
            ((cleaned++))
        fi
    fi

    # 백업 파일 (레벨 1+)
    if [ "$level" -ge 1 ]; then
        BACKUP_FILES=$(find . -maxdepth 1 -name "*.backup" 2>/dev/null)
        if [ -n "$BACKUP_FILES" ]; then
            echo "$BACKUP_FILES" | xargs rm -f
            BACKUP_COUNT=$(echo "$BACKUP_FILES" | wc -l | xargs)
            log_success "삭제: *.backup 파일 ${BACKUP_COUNT}개"
            ((cleaned++))
        fi

        BACKUP_DIRS=$(find . -maxdepth 1 -type d \( -name "*_backup" -o -name ".production_backup" -o -name ".dev_backup" \) 2>/dev/null)
        if [ -n "$BACKUP_DIRS" ]; then
            echo "$BACKUP_DIRS" | xargs rm -rf
            BACKUP_DIR_COUNT=$(echo "$BACKUP_DIRS" | wc -l | xargs)
            log_success "삭제: 백업 폴더 ${BACKUP_DIR_COUNT}개"
            ((cleaned++))
        fi
    fi

    # macOS 메타데이터 (레벨 2+)
    if [ "$level" -ge 2 ]; then
        DS_COUNT=$(find . -name ".DS_Store" 2>/dev/null | wc -l | xargs)
        if [ "$DS_COUNT" -gt 0 ]; then
            find . -name ".DS_Store" -delete 2>/dev/null
            log_success "삭제: .DS_Store ${DS_COUNT}개"
            ((cleaned++))
        fi
    fi

    # 임시 파일 (레벨 2+)
    if [ "$level" -ge 2 ]; then
        TEMP_COUNT=$(find . -maxdepth 2 \( -name "*.tmp" -o -name "*~" -o -name "*.swp" \) 2>/dev/null | wc -l | xargs)
        if [ "$TEMP_COUNT" -gt 0 ]; then
            find . -maxdepth 2 \( -name "*.tmp" -o -name "*~" -o -name "*.swp" \) -delete 2>/dev/null
            log_success "삭제: 임시 파일 ${TEMP_COUNT}개"
            ((cleaned++))
        fi
    fi

    if [ "$cleaned" -eq 0 ]; then
        log_info "정리할 항목 없음"
    fi

    echo ""
}

# Docker 정리
cleanup_docker() {
    local level=$1
    log_header "🐳 Docker 정리 (레벨 $level)"
    echo ""

    if ! command -v docker &> /dev/null; then
        log_warn "Docker가 설치되어 있지 않습니다"
        echo ""
        return
    fi

    if ! docker ps &> /dev/null 2>&1; then
        log_warn "Docker 실행 권한이 없습니다"
        echo ""
        return
    fi

    case $level in
        1)
            # 안전 정리
            echo "  [1/3] Dangling 이미지..."
            docker image prune -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true

            echo "  [2/3] 중지된 컨테이너..."
            docker container prune -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true

            echo "  [3/3] 미사용 네트워크..."
            docker network prune -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true
            ;;
        2)
            # 일반 정리
            echo "  [1/4] 미사용 이미지..."
            docker image prune -a -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true

            echo "  [2/4] 중지된 컨테이너..."
            docker container prune -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true

            echo "  [3/4] 미사용 네트워크..."
            docker network prune -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true

            echo "  [4/4] 빌드 캐시..."
            docker builder prune -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true
            ;;
        3)
            # 전체 정리
            echo "  [1/2] Docker 시스템 전체..."
            docker system prune -a -f --volumes 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true

            echo "  [2/2] 빌드 캐시 전체..."
            docker builder prune -a -f 2>&1 | grep -E "Total reclaimed|deleted" | awk '{print "    " $0}' || true
            ;;
    esac

    log_success "Docker 정리 완료"
    echo ""
}

# Docker 루트 정리 (NAS 전용)
cleanup_docker_root() {
    local level=$1
    log_header "🗄️  Docker 루트 정리 (레벨 $level)"
    echo ""

    if [ ! -d "$DOCKER_ROOT" ]; then
        log_warn "Docker 루트를 찾을 수 없습니다: $DOCKER_ROOT"
        echo ""
        return
    fi

    local cleaned=0

    # 임시 파일 (레벨 2+)
    if [ "$level" -ge 2 ]; then
        TEMP_COUNT=$(find "$DOCKER_ROOT" -name "*.tmp" -o -name "*~" -o -name ".DS_Store" 2>/dev/null | wc -l | xargs)
        if [ "$TEMP_COUNT" -gt 0 ]; then
            find "$DOCKER_ROOT" \( -name "*.tmp" -o -name "*~" -o -name ".DS_Store" \) -delete 2>/dev/null
            log_success "삭제: 임시 파일 ${TEMP_COUNT}개"
            ((cleaned++))
        fi
    fi

    # 오래된 로그 (레벨 3)
    if [ "$level" -ge 3 ]; then
        OLD_LOGS=$(find "$DOCKER_ROOT" -name "*.log" -mtime +30 2>/dev/null | wc -l | xargs)
        if [ "$OLD_LOGS" -gt 0 ]; then
            find "$DOCKER_ROOT" -name "*.log" -mtime +30 -delete 2>/dev/null
            log_success "삭제: 오래된 로그 (30일+) ${OLD_LOGS}개"
            ((cleaned++))
        fi

        # 큰 로그 압축
        LARGE_LOGS=$(find "$DOCKER_ROOT" -name "*.log" -size +100M 2>/dev/null)
        if [ -n "$LARGE_LOGS" ]; then
            echo "$LARGE_LOGS" | while read file; do
                if gzip "$file" 2>/dev/null; then
                    log_success "압축: $(basename "$file").gz"
                    ((cleaned++))
                fi
            done
        fi

        # 빈 디렉토리
        EMPTY_DIRS=$(find "$DOCKER_ROOT" -type d -empty 2>/dev/null | wc -l | xargs)
        if [ "$EMPTY_DIRS" -gt 0 ]; then
            find "$DOCKER_ROOT" -type d -empty -delete 2>/dev/null
            log_success "삭제: 빈 디렉토리 ${EMPTY_DIRS}개"
            ((cleaned++))
        fi
    fi

    if [ "$cleaned" -eq 0 ]; then
        log_info "정리할 항목 없음"
    fi

    echo ""
}

# 정리 실행
run_cleanup() {
    local level=$1

    echo ""
    log_header "🚀 정리 레벨 $level 실행 중..."
    echo ""

    # 정리 전 상태 저장
    BEFORE_DF=$(df -h / | tail -1 | awk '{print $5}')

    # 순차 실행
    cleanup_project "$level"
    cleanup_docker "$level"
    cleanup_docker_root "$level"

    # 정리 후 상태
    log_header "📈 정리 결과"
    echo ""

    AFTER_DF=$(df -h / | tail -1 | awk '{print $5}')
    echo "  디스크 사용률: $BEFORE_DF → $AFTER_DF"
    echo ""

    if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
        echo "  Docker 시스템:"
        docker system df 2>/dev/null | awk '{print "    " $0}'
    fi

    echo ""
    log_success "전체 정리 완료!"
    echo ""
}

# 레벨 선택 (대화형)
select_level() {
    echo ""
    log_header "🎯 정리 레벨 선택"
    echo ""
    echo -e "${GREEN}1)${NC} 레벨 1 (안전) - 프로젝트 빌드 캐시 + Docker 안전 정리"
    echo "   • .next/, tsconfig.tsbuildinfo"
    echo "   • 백업 파일 (*.backup, *_backup/)"
    echo "   • Dangling Docker 이미지, 중지된 컨테이너"
    echo ""
    echo -e "${YELLOW}2)${NC} 레벨 2 (일반) - 레벨 1 + 미사용 이미지 + 임시 파일 ${CYAN}[권장]${NC}"
    echo "   • 레벨 1 항목 전체"
    echo "   • .DS_Store, *.tmp, *~, *.swp"
    echo "   • Docker 미사용 이미지, 빌드 캐시"
    echo ""
    echo -e "${RED}3)${NC} 레벨 3 (전체) - 레벨 2 + 볼륨 + 로그 + 전체 캐시 ${YELLOW}[주의]${NC}"
    echo "   • 레벨 2 항목 전체"
    echo "   • Docker 미사용 볼륨 (데이터 손실 가능)"
    echo "   • 오래된 로그 (30일+), 큰 로그 압축 (100MB+)"
    echo "   • 빈 디렉토리"
    echo ""

    read -p "선택 [1-3]: " -n 1 -r LEVEL
    echo ""

    if [[ ! $LEVEL =~ ^[1-3]$ ]]; then
        log_error "잘못된 선택입니다"
        exit 1
    fi

    return $LEVEL
}

# 최종 확인
confirm_cleanup() {
    local level=$1

    echo ""
    log_header "⚠️  최종 확인"
    echo ""
    echo -e "${YELLOW}레벨 $level 정리를 실행합니다.${NC}"
    echo -e "${YELLOW}삭제된 데이터는 복구할 수 없습니다!${NC}"
    echo ""

    read -p "계속하시겠습니까? [y/N]: " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "취소되었습니다"
        exit 0
    fi
}

# =============================================================================
# 메인 실행
# =============================================================================

# 인자 파싱
MODE="interactive"
LEVEL=0

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_usage
            ;;
        --auto)
            MODE="auto"
            LEVEL=2
            shift
            ;;
        --level)
            MODE="auto"
            LEVEL=$2
            if [[ ! $LEVEL =~ ^[1-3]$ ]]; then
                log_error "레벨은 1-3 사이여야 합니다"
                exit 1
            fi
            shift 2
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_usage
            ;;
    esac
done

# 헤더 표시
show_header

# 디스크 분석
analyze_disk

# 모드에 따라 실행
if [ "$MODE" = "interactive" ]; then
    select_level
    LEVEL=$?
    confirm_cleanup "$LEVEL"
    run_cleanup "$LEVEL"
else
    log_info "자동 모드: 레벨 $LEVEL"
    confirm_cleanup "$LEVEL"
    run_cleanup "$LEVEL"
fi

# 완료
log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "✨ NAS 정리가 완료되었습니다!"
log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_info "상세 로그: $LOG_FILE"
echo ""

exit 0
