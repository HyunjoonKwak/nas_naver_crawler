#!/bin/bash
# =============================================================================
# 루트 폴더 정리 스크립트 v1.0
# =============================================================================
# 사용법:
#   ./scripts/cleanup-root.sh           # 안전 모드 (확인만)
#   ./scripts/cleanup-root.sh --clean   # 실제 삭제
#
# 기능:
#   - 불필요한 빌드 캐시 (.next, tsconfig.tsbuildinfo)
#   - 백업 파일 (*.backup, .production_backup/)
#   - macOS 메타데이터 (.DS_Store)
#   - 임시 파일
#   - Git 추적되지 않는 큰 파일 찾기
# =============================================================================

set -e

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

# 클린 모드 확인
CLEAN_MODE=false
if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
    CLEAN_MODE=true
fi

# 헤더
clear
echo ""
log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_header "  루트 폴더 정리 스크립트 v1.0"
log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$CLEAN_MODE" = true ]; then
    log_warn "실제 삭제 모드 (--clean)"
else
    log_info "안전 모드 (확인만, 삭제 안 함)"
    log_info "실제 삭제하려면: ./scripts/cleanup-root.sh --clean"
fi

echo ""

# 1. 빌드 캐시 확인
log_header "1️⃣  빌드 캐시 확인"
echo ""

NEXT_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "0B")
TSBUILDINFO_SIZE=$(du -sh tsconfig.tsbuildinfo 2>/dev/null | cut -f1 || echo "0B")

if [ -d ".next" ]; then
    echo "  📁 .next/ (Next.js 빌드 캐시): $NEXT_SIZE"
    if [ "$CLEAN_MODE" = true ]; then
        rm -rf .next
        log_success "삭제: .next/"
    fi
else
    echo "  ✓ .next/ 없음"
fi

if [ -f "tsconfig.tsbuildinfo" ]; then
    echo "  📄 tsconfig.tsbuildinfo (TypeScript 캐시): $TSBUILDINFO_SIZE"
    if [ "$CLEAN_MODE" = true ]; then
        rm -f tsconfig.tsbuildinfo
        log_success "삭제: tsconfig.tsbuildinfo"
    fi
else
    echo "  ✓ tsconfig.tsbuildinfo 없음"
fi

echo ""

# 2. 백업 파일 확인
log_header "2️⃣  백업 파일 확인"
echo ""

BACKUP_FILES=$(find . -maxdepth 1 -name "*.backup" 2>/dev/null | wc -l | xargs)
BACKUP_DIRS=$(find . -maxdepth 1 -type d -name "*_backup" -o -name ".production_backup" -o -name ".dev_backup" 2>/dev/null | wc -l | xargs)

if [ "$BACKUP_FILES" -gt 0 ]; then
    echo "  백업 파일 (*.backup):"
    find . -maxdepth 1 -name "*.backup" -exec ls -lh {} \; | awk '{print "    📄 " $9 " (" $5 ")"}'

    if [ "$CLEAN_MODE" = true ]; then
        find . -maxdepth 1 -name "*.backup" -delete
        log_success "삭제: *.backup 파일 ${BACKUP_FILES}개"
    fi
else
    echo "  ✓ 백업 파일 없음"
fi

if [ "$BACKUP_DIRS" -gt 0 ]; then
    echo ""
    echo "  백업 폴더:"
    find . -maxdepth 1 -type d \( -name "*_backup" -o -name ".production_backup" -o -name ".dev_backup" \) -exec du -sh {} \; | awk '{print "    📁 " $2 " (" $1 ")"}'

    if [ "$CLEAN_MODE" = true ]; then
        find . -maxdepth 1 -type d \( -name "*_backup" -o -name ".production_backup" -o -name ".dev_backup" \) -exec rm -rf {} \;
        log_success "삭제: 백업 폴더 ${BACKUP_DIRS}개"
    fi
else
    echo "  ✓ 백업 폴더 없음"
fi

echo ""

# 3. macOS 메타데이터
log_header "3️⃣  macOS 메타데이터"
echo ""

DS_STORE_COUNT=$(find . -name ".DS_Store" 2>/dev/null | wc -l | xargs)

if [ "$DS_STORE_COUNT" -gt 0 ]; then
    echo "  .DS_Store 파일: ${DS_STORE_COUNT}개"
    find . -name ".DS_Store" -exec ls -lh {} \; | head -5 | awk '{print "    📄 " $9}'

    if [ "$DS_STORE_COUNT" -gt 5 ]; then
        echo "    ... (총 ${DS_STORE_COUNT}개)"
    fi

    if [ "$CLEAN_MODE" = true ]; then
        find . -name ".DS_Store" -delete
        log_success "삭제: .DS_Store 파일 ${DS_STORE_COUNT}개"
    fi
else
    echo "  ✓ .DS_Store 파일 없음"
fi

echo ""

# 4. 임시 파일
log_header "4️⃣  임시 파일"
echo ""

TEMP_COUNT=$(find . -maxdepth 2 \( -name "*.tmp" -o -name "*~" -o -name "*.swp" \) 2>/dev/null | wc -l | xargs)

if [ "$TEMP_COUNT" -gt 0 ]; then
    echo "  임시 파일 (*.tmp, *~, *.swp): ${TEMP_COUNT}개"
    find . -maxdepth 2 \( -name "*.tmp" -o -name "*~" -o -name "*.swp" \) -exec ls -lh {} \; | awk '{print "    📄 " $9 " (" $5 ")"}'

    if [ "$CLEAN_MODE" = true ]; then
        find . -maxdepth 2 \( -name "*.tmp" -o -name "*~" -o -name "*.swp" \) -delete
        log_success "삭제: 임시 파일 ${TEMP_COUNT}개"
    fi
else
    echo "  ✓ 임시 파일 없음"
fi

echo ""

# 5. 큰 파일 찾기 (Git 추적되지 않는)
log_header "5️⃣  큰 파일 찾기 (10MB 이상, Git 미추적)"
echo ""

# Git 추적되지 않는 큰 파일 찾기
LARGE_FILES=$(git ls-files --others --exclude-standard 2>/dev/null | while read file; do
    if [ -f "$file" ]; then
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ "$SIZE" -gt 10485760 ]; then
            echo "$file|$SIZE"
        fi
    fi
done)

if [ -n "$LARGE_FILES" ]; then
    echo "  큰 파일 발견:"
    echo "$LARGE_FILES" | while IFS='|' read file size; do
        HUMAN_SIZE=$(numfmt --to=iec-i --suffix=B "$size" 2>/dev/null || echo "${size}B")
        echo "    📄 $file ($HUMAN_SIZE)"
    done
    echo ""
    log_warn "이 파일들은 .gitignore에 추가하는 것을 고려하세요"
else
    echo "  ✓ 큰 파일 없음"
fi

echo ""

# 6. 전체 통계
log_header "6️⃣  전체 통계"
echo ""

TOTAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
GITIGNORED_SIZE=$(du -sh .next node_modules 2>/dev/null | awk '{sum+=$1} END {print sum "M"}')

echo "  전체 프로젝트 크기: $TOTAL_SIZE"
echo "  Git 무시 폴더 (.next, node_modules): ~$GITIGNORED_SIZE"
echo ""

# 디스크 사용량 Top 10
echo "  📊 디스크 사용량 Top 10 (폴더):"
du -sh */ 2>/dev/null | sort -hr | head -10 | awk '{print "    " $2 " (" $1 ")"}'

echo ""

# 완료
log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$CLEAN_MODE" = true ]; then
    log_success "정리 완료!"
else
    log_info "확인 완료 (삭제하지 않음)"
    echo ""
    log_warn "실제 삭제하려면: ./scripts/cleanup-root.sh --clean"
fi

log_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
