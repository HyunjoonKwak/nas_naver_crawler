#!/bin/bash

###############################################################################
# NAS Docker 정리 스크립트
# 사용법: ./nas-docker-cleanup.sh
# 설명: NAS의 Docker 이미지, 컨테이너, 볼륨 및 프로젝트 파일을 정리합니다.
###############################################################################

set -e

# NAS Docker 루트 디렉토리 (환경에 맞게 수정)
DOCKER_ROOT="/volume1/docker"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║          NAS Docker 정리 스크립트                          ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Docker 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker가 설치되어 있지 않습니다!"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Docker 실행 권한이 없습니다. sudo로 실행하세요."
    exit 1
fi

# 현재 상태 분석
echo -e "${BLUE}[1/5]${NC} 현재 Docker 상태 분석 중..."
echo ""

RUNNING=$(docker ps -q | wc -l)
STOPPED=$(docker ps -a -f status=exited -q | wc -l)
IMAGES=$(docker images -q | wc -l)
DANGLING=$(docker images -f "dangling=true" -q | wc -l)
VOLUMES=$(docker volume ls -q | wc -l)

echo "  실행 중인 컨테이너: ${RUNNING}개"
echo "  중지된 컨테이너: ${STOPPED}개"
echo "  전체 이미지: ${IMAGES}개"
echo "  Dangling 이미지: ${DANGLING}개"
echo "  볼륨: ${VOLUMES}개"
echo ""

docker system df
echo ""

# Docker 루트 디렉토리 점검
echo -e "${BLUE}[2/5]${NC} Docker 루트 디렉토리 점검 중..."
echo ""

if [ -d "$DOCKER_ROOT" ]; then
    echo "  📁 Docker 루트: $DOCKER_ROOT"
    echo ""

    # 프로젝트별 디스크 사용량
    echo "  프로젝트별 디스크 사용량:"
    du -sh $DOCKER_ROOT/*/ 2>/dev/null | sort -hr | head -10
    echo ""

    # 큰 로그 파일 찾기 (10MB 이상)
    echo "  📝 큰 로그 파일 (10MB 이상):"
    find $DOCKER_ROOT -name "*.log" -size +10M -exec ls -lh {} \; 2>/dev/null | awk '{print "    " $9 " (" $5 ")"}' | head -10

    # 임시 파일 찾기
    TEMP_COUNT=$(find $DOCKER_ROOT -name "*.tmp" -o -name "*~" -o -name ".DS_Store" 2>/dev/null | wc -l)
    echo ""
    echo "  🗑️  임시 파일: ${TEMP_COUNT}개"

else
    echo "  ⚠️  Docker 루트 디렉토리를 찾을 수 없습니다: $DOCKER_ROOT"
    echo "  → Docker 정리만 진행합니다."
fi
echo ""

# 정리 모드 선택
echo -e "${BLUE}[3/5]${NC} 정리 모드 선택"
echo ""
echo -e "${GREEN}1)${NC} 안전 정리 (Dangling 이미지 + 중지된 컨테이너)"
echo -e "${YELLOW}2)${NC} 일반 정리 (안전 정리 + 미사용 이미지 + 임시 파일)"
echo -e "${RED}3)${NC} 전체 정리 (일반 정리 + 미사용 볼륨 + 빌드 캐시 + 큰 로그 파일)"
echo ""

read -p "선택 [1-3]: " -n 1 -r MODE
echo ""
echo ""

if [[ ! $MODE =~ ^[1-3]$ ]]; then
    echo -e "${RED}[ERROR]${NC} 잘못된 선택입니다."
    exit 1
fi

# 최종 확인
echo -e "${BLUE}[4/5]${NC} 최종 확인"
echo ""
echo -e "${YELLOW}⚠️  주의: 삭제된 데이터는 복구할 수 없습니다!${NC}"
echo ""

read -p "정말 정리하시겠습니까? [y/N]: " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}[INFO]${NC} 취소되었습니다."
    exit 0
fi

# 정리 실행
echo ""
echo -e "${BLUE}[5/5]${NC} 정리 실행 중..."
echo ""

case $MODE in
    1)
        # 안전 정리
        echo "  [1/3] Dangling 이미지 삭제..."
        docker image prune -f
        echo "  [2/3] 중지된 컨테이너 삭제..."
        docker container prune -f
        echo "  [3/3] 미사용 네트워크 삭제..."
        docker network prune -f
        ;;
    2)
        # 일반 정리
        echo "  [1/5] 미사용 이미지 삭제..."
        docker image prune -a -f
        echo "  [2/5] 중지된 컨테이너 삭제..."
        docker container prune -f
        echo "  [3/5] 미사용 네트워크 삭제..."
        docker network prune -f
        echo "  [4/5] 빌드 캐시 삭제..."
        docker builder prune -f

        # 프로젝트 임시 파일 정리
        if [ -d "$DOCKER_ROOT" ]; then
            echo "  [5/5] 임시 파일 정리..."
            DELETED=0
            DELETED=$(find $DOCKER_ROOT -name "*.tmp" -o -name "*~" -o -name ".DS_Store" 2>/dev/null -exec rm -f {} \; -print | wc -l)
            echo "      → ${DELETED}개 파일 삭제됨"
        fi
        ;;
    3)
        # 전체 정리
        echo "  [1/6] Docker 전체 시스템 정리..."
        docker system prune -a -f --volumes
        echo "  [2/6] 빌드 캐시 전체 삭제..."
        docker builder prune -a -f

        # 프로젝트 파일 정리
        if [ -d "$DOCKER_ROOT" ]; then
            echo "  [3/6] 임시 파일 정리..."
            DELETED=$(find $DOCKER_ROOT -name "*.tmp" -o -name "*~" -o -name ".DS_Store" 2>/dev/null -exec rm -f {} \; -print | wc -l)
            echo "      → ${DELETED}개 파일 삭제됨"

            echo "  [4/6] 오래된 로그 파일 정리 (30일 이상)..."
            OLD_LOGS=$(find $DOCKER_ROOT -name "*.log" -mtime +30 2>/dev/null -exec rm -f {} \; -print | wc -l)
            echo "      → ${OLD_LOGS}개 로그 파일 삭제됨"

            echo "  [5/6] 큰 로그 파일 압축 (100MB 이상)..."
            find $DOCKER_ROOT -name "*.log" -size +100M 2>/dev/null | while read file; do
                gzip "$file" 2>/dev/null && echo "      → 압축: $file.gz"
            done

            echo "  [6/6] 빈 디렉토리 정리..."
            EMPTY_DIRS=$(find $DOCKER_ROOT -type d -empty 2>/dev/null -delete -print | wc -l)
            echo "      → ${EMPTY_DIRS}개 빈 디렉토리 삭제됨"
        fi
        ;;
esac

echo ""
echo -e "${GREEN}✅ 정리 완료!${NC}"
echo ""

# 정리 후 상태
echo -e "${BLUE}정리 후 상태:${NC}"
docker system df

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Docker 정리가 완료되었습니다!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit 0
