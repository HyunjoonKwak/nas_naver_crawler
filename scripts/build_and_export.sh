#!/bin/bash
# Mac에서 빌드 후 NAS로 이미지 전송하는 스크립트

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Docker 이미지 빌드 및 전송${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# NAS 정보 입력
read -p "NAS IP 주소를 입력하세요 (예: 192.168.0.100): " NAS_IP
read -p "NAS SSH 사용자명을 입력하세요 (예: admin): " NAS_USER

IMAGE_NAME="naver-crawler:latest"
TAR_FILE="naver-crawler-image.tar"

# 1. 로컬에서 Docker 이미지 빌드
echo -e "\n${GREEN}[1/4] Docker 이미지 빌드 중...${NC}"
docker-compose build

# 2. 이미지를 tar 파일로 저장
echo -e "\n${GREEN}[2/4] 이미지를 tar 파일로 저장 중...${NC}"
docker save -o ${TAR_FILE} ${IMAGE_NAME}

# 3. NAS로 전송
echo -e "\n${GREEN}[3/4] NAS로 이미지 전송 중...${NC}"
echo "파일 크기: $(ls -lh ${TAR_FILE} | awk '{print $5}')"
scp ${TAR_FILE} ${NAS_USER}@${NAS_IP}:/volume1/code_work/nas_naver_crawler/

# 4. NAS에서 이미지 로드
echo -e "\n${GREEN}[4/4] NAS에서 이미지 로드 중...${NC}"
ssh ${NAS_USER}@${NAS_IP} "cd /volume1/code_work/nas_naver_crawler && docker load -i ${TAR_FILE} && rm ${TAR_FILE}"

# 5. 로컬 tar 파일 삭제
rm ${TAR_FILE}

echo -e "\n${GREEN}✅ 완료! NAS에서 컨테이너를 시작하세요:${NC}"
echo -e "${BLUE}   ssh ${NAS_USER}@${NAS_IP}${NC}"
echo -e "${BLUE}   cd /volume1/code_work/nas_naver_crawler${NC}"
echo -e "${BLUE}   docker-compose up -d${NC}"

