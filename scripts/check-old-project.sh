#!/bin/bash

# 기존 naver-crawler 프로젝트 리소스 확인 및 정리 스크립트
# 사용법: bash scripts/check-old-project.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  naver-crawler 프로젝트 리소스 확인${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. naver-crawler 컨테이너 확인
echo -e "${CYAN}[1] naver-crawler 컨테이너${NC}"
echo "----------------------------------------"
CONTAINERS=$(docker ps -a --filter "name=naver-crawler" --format "{{.Names}}\t{{.Status}}\t{{.Image}}" 2>/dev/null)
if [ -z "$CONTAINERS" ]; then
  echo -e "${GREEN}✓ naver-crawler 컨테이너 없음${NC}"
else
  echo "$CONTAINERS" | while read line; do
    echo -e "${YELLOW}  - $line${NC}"
  done
  echo ""
  echo -e "${RED}발견됨!${NC} 다음 명령어로 삭제:"
  docker ps -a --filter "name=naver-crawler" --format "{{.Names}}" | while read name; do
    STATUS=$(docker ps -a --filter "name=$name" --format "{{.Status}}")
    if [[ $STATUS == Up* ]]; then
      echo "  docker stop $name && docker rm $name"
    else
      echo "  docker rm $name"
    fi
  done
fi
echo ""

# 2. naver-crawler 볼륨 확인
echo -e "${CYAN}[2] naver-crawler 볼륨${NC}"
echo "----------------------------------------"
VOLUMES=$(docker volume ls --filter "name=naver" --format "{{.Name}}" 2>/dev/null)
if [ -z "$VOLUMES" ]; then
  echo -e "${GREEN}✓ naver-crawler 볼륨 없음${NC}"
else
  echo "$VOLUMES" | while read vol; do
    SIZE=$(docker volume inspect $vol --format "{{.Mountpoint}}" 2>/dev/null | xargs du -sh 2>/dev/null | cut -f1 || echo "알 수 없음")
    echo -e "${YELLOW}  - $vol (크기: $SIZE)${NC}"
  done
  echo ""
  echo -e "${RED}발견됨!${NC} 다음 명령어로 삭제 (${RED}데이터 손실 주의!${NC}):"
  echo "$VOLUMES" | while read vol; do
    echo "  docker volume rm $vol"
  done
  echo ""
  echo "또는 한 번에 삭제:"
  echo "  docker volume rm $VOLUMES"
fi
echo ""

# 3. naver-crawler 네트워크 확인
echo -e "${CYAN}[3] naver-crawler 네트워크${NC}"
echo "----------------------------------------"
NETWORKS=$(docker network ls --filter "name=naver" --format "{{.Name}}" 2>/dev/null | grep -v "bridge\|host\|none")
if [ -z "$NETWORKS" ]; then
  echo -e "${GREEN}✓ naver-crawler 네트워크 없음${NC}"
else
  echo "$NETWORKS" | while read net; do
    echo -e "${YELLOW}  - $net${NC}"
  done
  echo ""
  echo -e "${RED}발견됨!${NC} 다음 명령어로 삭제:"
  echo "$NETWORKS" | while read net; do
    echo "  docker network rm $net"
  done
  echo ""
  echo "또는 한 번에 삭제:"
  echo "  docker network rm $NETWORKS"
fi
echo ""

# 4. naver-crawler 이미지 확인
echo -e "${CYAN}[4] naver-crawler 이미지${NC}"
echo "----------------------------------------"
IMAGES=$(docker images --filter "reference=*naver*crawler*" --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" 2>/dev/null)
if [ -z "$IMAGES" ]; then
  # nas_naver_crawler 패턴도 확인
  IMAGES=$(docker images --filter "reference=*nas*naver*" --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" 2>/dev/null)
fi
if [ -z "$IMAGES" ]; then
  echo -e "${GREEN}✓ naver-crawler 이미지 없음${NC}"
else
  echo "$IMAGES" | while read line; do
    echo -e "${YELLOW}  - $line${NC}"
  done
  echo ""
  echo -e "${RED}발견됨!${NC} 다음 명령어로 삭제:"
  docker images --filter "reference=*naver*crawler*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | while read img; do
    echo "  docker rmi $img"
  done
  docker images --filter "reference=*nas*naver*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | while read img; do
    echo "  docker rmi $img"
  done
fi
echo ""

# 5. 전체 정리 스크립트 생성
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  전체 정리 명령어${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

HAS_RESOURCES=false

# 컨테이너가 있으면
if [ ! -z "$CONTAINERS" ]; then
  HAS_RESOURCES=true
fi

# 볼륨이 있으면
if [ ! -z "$VOLUMES" ]; then
  HAS_RESOURCES=true
fi

# 네트워크가 있으면
if [ ! -z "$NETWORKS" ]; then
  HAS_RESOURCES=true
fi

# 이미지가 있으면
if [ ! -z "$IMAGES" ]; then
  HAS_RESOURCES=true
fi

if [ "$HAS_RESOURCES" = false ]; then
  echo -e "${GREEN}✓ 정리할 naver-crawler 리소스 없음!${NC}"
  echo -e "${GREEN}✓ 깨끗한 상태입니다.${NC}"
else
  echo -e "${YELLOW}다음 명령어들을 순서대로 실행하세요:${NC}"
  echo ""

  # 컨테이너 정리
  CONTAINER_NAMES=$(docker ps -a --filter "name=naver-crawler" --format "{{.Names}}" 2>/dev/null)
  if [ ! -z "$CONTAINER_NAMES" ]; then
    echo -e "${CYAN}# 1. 컨테이너 중지 및 삭제${NC}"
    echo "$CONTAINER_NAMES" | while read name; do
      STATUS=$(docker ps -a --filter "name=$name" --format "{{.Status}}")
      if [[ $STATUS == Up* ]]; then
        echo "docker stop $name"
      fi
    done
    echo "docker rm $CONTAINER_NAMES"
    echo ""
  fi

  # 볼륨 정리
  if [ ! -z "$VOLUMES" ]; then
    echo -e "${CYAN}# 2. 볼륨 삭제 (${RED}데이터 손실 주의!${NC}${CYAN})${NC}"
    echo "docker volume rm $VOLUMES"
    echo ""
  fi

  # 네트워크 정리
  if [ ! -z "$NETWORKS" ]; then
    echo -e "${CYAN}# 3. 네트워크 삭제${NC}"
    echo "docker network rm $NETWORKS"
    echo ""
  fi

  # 이미지 정리
  IMAGE_IDS=$(docker images --filter "reference=*naver*crawler*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null)
  IMAGE_IDS2=$(docker images --filter "reference=*nas*naver*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null)
  ALL_IMAGES="$IMAGE_IDS $IMAGE_IDS2"
  if [ ! -z "$ALL_IMAGES" ]; then
    echo -e "${CYAN}# 4. 이미지 삭제${NC}"
    echo "docker rmi $ALL_IMAGES"
    echo ""
  fi

  # 한 번에 실행하는 스크립트
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  한 번에 실행 (복사해서 사용)${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""

  cat << 'CLEANUP_SCRIPT'
# naver-crawler 프로젝트 완전 정리 스크립트
# 경고: 모든 데이터가 삭제됩니다!

# 실행 중인 컨테이너 중지
docker ps --filter "name=naver-crawler" -q | xargs -r docker stop

# 컨테이너 삭제
docker ps -a --filter "name=naver-crawler" -q | xargs -r docker rm

# 볼륨 삭제 (데이터 손실!)
docker volume ls --filter "name=naver" -q | xargs -r docker volume rm

# 네트워크 삭제
docker network ls --filter "name=naver" -q | xargs -r docker network rm

# 이미지 삭제
docker images --filter "reference=*naver*crawler*" -q | xargs -r docker rmi
docker images --filter "reference=*nas*naver*" -q | xargs -r docker rmi

echo "✓ naver-crawler 리소스 정리 완료!"
CLEANUP_SCRIPT

fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  현재 프로젝트 디렉토리 확인${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "현재 위치: $(pwd)"
echo ""
if [[ "$(pwd)" == *"nas_naver_crawler"* ]]; then
  echo -e "${GREEN}✓ 올바른 디렉토리입니다${NC}"
  echo ""
  echo "정리 후 새로 시작하려면:"
  echo "  docker-compose up -d"
else
  echo -e "${RED}⚠️  경고: nas_naver_crawler 디렉토리가 아닙니다${NC}"
  echo "다음 명령어로 이동하세요:"
  echo "  cd /volume1/code_work/nas_naver_crawler"
fi
echo ""
