#!/bin/bash

# Docker 리소스 정리 스크립트
# 사용법: bash scripts/cleanup-docker.sh

set -e

echo "========================================"
echo "  Docker 리소스 확인 및 정리 스크립트"
echo "========================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 현재 실행 중인 컨테이너 확인
echo -e "${BLUE}[1단계] 실행 중인 컨테이너 확인${NC}"
echo "========================================"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. 중지된 컨테이너 확인
echo -e "${BLUE}[2단계] 중지된 컨테이너 확인${NC}"
echo "========================================"
STOPPED_CONTAINERS=$(docker ps -a -f status=exited --format "{{.Names}}")
if [ -z "$STOPPED_CONTAINERS" ]; then
  echo "중지된 컨테이너 없음"
else
  docker ps -a -f status=exited --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
fi
echo ""

# 3. Docker 네트워크 확인
echo -e "${BLUE}[3단계] Docker 네트워크 확인${NC}"
echo "========================================"
docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
echo ""

# 4. Docker 볼륨 확인
echo -e "${BLUE}[4단계] Docker 볼륨 확인${NC}"
echo "========================================"
docker volume ls --format "table {{.Name}}\t{{.Driver}}\t{{.Mountpoint}}"
echo ""

# 5. 이미지 확인
echo -e "${BLUE}[5단계] Docker 이미지 확인${NC}"
echo "========================================"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

# 6. 디스크 사용량 확인
echo -e "${BLUE}[6단계] Docker 디스크 사용량${NC}"
echo "========================================"
docker system df
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  정리 옵션${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "다음 명령어들을 복사해서 실행하세요:"
echo ""

# naver-crawler 관련만 정리
echo -e "${GREEN}# Option 1: naver-crawler 프로젝트만 정리 (권장)${NC}"
echo "docker-compose down                    # 현재 프로젝트 컨테이너 중지 및 삭제"
echo "docker volume rm nas_naver_crawler_postgres_data nas_naver_crawler_crawled_data nas_naver_crawler_logs 2>/dev/null || true"
echo "docker network rm nas_naver_crawler_crawler-network 2>/dev/null || true"
echo ""

# 중지된 컨테이너만 정리
echo -e "${GREEN}# Option 2: 중지된 컨테이너만 모두 삭제${NC}"
echo "docker container prune -f              # 중지된 컨테이너 모두 삭제"
echo ""

# 사용하지 않는 리소스 모두 정리
echo -e "${GREEN}# Option 3: 사용하지 않는 모든 리소스 정리 (신중!)${NC}"
echo "docker system prune -a --volumes -f    # 사용하지 않는 이미지, 볼륨, 네트워크 모두 삭제"
echo ""

# 개별 삭제 명령어
echo -e "${GREEN}# Option 4: 개별 삭제 (특정 컨테이너/볼륨/네트워크)${NC}"
echo "# 컨테이너 삭제:"
if [ ! -z "$STOPPED_CONTAINERS" ]; then
  for container in $STOPPED_CONTAINERS; do
    echo "docker rm $container"
  done
else
  echo "# (중지된 컨테이너 없음)"
fi
echo ""

echo "# 볼륨 삭제 (사용되지 않는 볼륨):"
echo "docker volume ls -q | xargs -r docker volume rm 2>/dev/null || echo '볼륨이 사용 중입니다'"
echo ""

echo "# 네트워크 삭제 (사용되지 않는 네트워크):"
echo "docker network prune -f"
echo ""

echo -e "${RED}⚠️  주의사항:${NC}"
echo "1. 실행 중인 컨테이너는 먼저 중지해야 삭제할 수 있습니다"
echo "2. 볼륨 삭제 시 저장된 데이터가 모두 삭제됩니다 (복구 불가)"
echo "3. 다른 프로젝트의 Docker 리소스는 건드리지 마세요"
echo "4. 확실하지 않으면 Option 1 (프로젝트별 정리)을 사용하세요"
echo ""

# 특정 패턴의 리소스 찾기
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  프로젝트별 리소스 찾기${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "# naver-crawler 관련 컨테이너:"
docker ps -a --filter "name=naver-crawler" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "없음"
echo ""

echo "# naver-crawler 관련 볼륨:"
docker volume ls --filter "name=nas_naver_crawler" --format "table {{.Name}}" 2>/dev/null || echo "없음"
echo ""

echo "# naver-crawler 관련 네트워크:"
docker network ls --filter "name=nas_naver_crawler" --format "table {{.Name}}" 2>/dev/null || echo "없음"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  추천 정리 순서${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "1. 먼저 현재 디렉토리 확인:"
echo "   pwd  # /volume1/code_work/nas_naver_crawler 인지 확인"
echo ""
echo "2. 현재 프로젝트 컨테이너 중지:"
echo "   docker-compose down"
echo ""
echo "3. 이전 프로젝트 리소스 확인 후 삭제:"
echo "   # 중지된 컨테이너 모두 삭제"
echo "   docker container prune -f"
echo ""
echo "   # 사용하지 않는 볼륨 삭제 (주의: 데이터 손실)"
echo "   docker volume prune -f"
echo ""
echo "   # 사용하지 않는 네트워크 삭제"
echo "   docker network prune -f"
echo ""
echo "   # 사용하지 않는 이미지 삭제"
echo "   docker image prune -a -f"
echo ""
echo "4. 현재 프로젝트 재시작:"
echo "   docker-compose up -d"
echo ""
