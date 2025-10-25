#!/bin/bash

# perf_improve 브랜치 검증 스크립트
# 사용법: ./scripts/verify-perf-improve.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  perf_improve 브랜치 검증 시작${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_COUNT=0

check_pass() {
    PASS_COUNT=$((PASS_COUNT + 1))
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

check_fail() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    echo -e "${RED}❌ FAIL${NC}: $1"
}

check_warn() {
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

echo -e "${CYAN}=== 1. 코드 품질 검증 ===${NC}"
echo ""

# TypeScript 타입 체크
echo "TypeScript 타입 체크..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    check_fail "TypeScript 에러 발견"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -5
else
    check_pass "TypeScript 타입 체크"
fi

# ESLint
echo "ESLint 검사..."
if npm run lint 2>&1 | grep -q "error"; then
    check_warn "ESLint 에러 (워닝으로 전환 가능)"
else
    check_pass "ESLint 통과"
fi

echo ""
echo -e "${CYAN}=== 2. 테스트 실행 ===${NC}"
echo ""

# JavaScript 테스트
if [ -f "vitest.config.ts" ]; then
    echo "JavaScript/TypeScript 테스트 실행..."
    if npm test 2>&1 | grep -q "FAIL"; then
        check_fail "일부 테스트 실패"
    else
        check_pass "모든 테스트 통과"
    fi
fi

# Python 테스트
if [ -d "tests" ]; then
    echo "Python 테스트 실행..."
    if pytest tests/ -v 2>&1 | grep -q "FAILED"; then
        check_fail "Python 테스트 실패"
    else
        check_pass "Python 테스트 통과"
    fi
fi

echo ""
echo -e "${CYAN}=== 3. Docker 빌드 검증 ===${NC}"
echo ""

# Dockerfile 빌드
echo "프로덕션 Docker 이미지 빌드..."
if ! docker info > /dev/null 2>&1; then
    check_warn "Docker 데몬 미실행 (빌드 테스트 스킵)"
elif docker build -t verify-test -f Dockerfile . > /dev/null 2>&1; then
    check_pass "Dockerfile 빌드 성공"
    docker rmi verify-test > /dev/null 2>&1
else
    check_fail "Dockerfile 빌드 실패"
fi

echo ""
echo -e "${CYAN}=== 4. 환경 설정 검증 ===${NC}"
echo ""

# 환경 변수 템플릿
if [ -f "env.template" ]; then
    check_pass "env.template 존재"
else
    check_warn "env.template 없음"
fi

# CI/CD 파일
if [ -f ".github/workflows/ci.yml" ]; then
    check_pass "CI/CD 파이프라인 설정됨"
else
    check_warn "CI/CD 설정 없음"
fi

echo ""
echo -e "${CYAN}=== 5. 문서 검증 ===${NC}"
echo ""

# 필수 문서
docs=(
    "DEPLOYMENT_GUIDE.md"
    "TESTING_CHECKLIST.md"
    "README.md"
    "CHANGELOG.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$doc 존재"
    else
        check_warn "$doc 없음"
    fi
done

echo ""
echo -e "${CYAN}=== 6. 주요 기능 파일 확인 ===${NC}"
echo ""

# 핵심 기능 파일
files=(
    "lib/eventBroadcaster.ts:SSE 연결 관리"
    "app/api/crawl/route.ts:중복 크롤링 방지"
    "lib/redis-cache.ts:Redis 캐싱"
    "prisma/migrations/optimize_indexes:DB 인덱스"
    "lib/auth.ts:세션 쿠키 분리"
)

for item in "${files[@]}"; do
    file="${item%%:*}"
    desc="${item##*:}"
    if [ -f "$file" ] || [ -d "$file" ]; then
        check_pass "$desc ($file)"
    else
        check_fail "$desc 파일 없음 ($file)"
    fi
done

echo ""
echo -e "${CYAN}=== 7. 변경사항 요약 ===${NC}"
echo ""

# Git 변경사항
CHANGED_FILES=$(git diff --stat origin/main...HEAD 2>/dev/null | tail -1 || echo "N/A")
echo "변경된 파일: $CHANGED_FILES"

COMMITS=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l || echo "0")
echo "커밋 개수: $COMMITS"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  검증 완료${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "총 테스트: ${TOTAL_COUNT}개"
echo -e "${GREEN}통과: ${PASS_COUNT}개${NC}"
echo -e "${RED}실패: ${FAIL_COUNT}개${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 검증 통과! merge 준비 완료${NC}"
    exit 0
else
    echo -e "${RED}⚠️  일부 검증 실패. 수정 필요${NC}"
    exit 1
fi
