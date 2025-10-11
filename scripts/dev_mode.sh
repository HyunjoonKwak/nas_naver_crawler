#!/bin/bash
# 개발 모드로 실행 (빌드 없이)

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  개발 모드 시작 (빌드 불필요)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}ℹ️  개발 모드 특징:${NC}"
echo "  - Docker 이미지 빌드 불필요"
echo "  - 소스 코드 실시간 반영"
echo "  - 첫 실행 시 npm install 수행"
echo "  - Hot reload 지원"
echo ""

echo -e "${GREEN}[1/2] 기존 컨테이너 정리...${NC}"
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

echo -e "${GREEN}[2/2] 개발 모드 컨테이너 시작...${NC}"
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo -e "${GREEN}✅ 개발 모드 시작 완료!${NC}"
echo ""
echo -e "${BLUE}📝 로그 확인:${NC}"
echo "   docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo -e "${BLUE}🔄 재시작:${NC}"
echo "   docker-compose -f docker-compose.dev.yml restart"
echo ""
echo -e "${BLUE}🛑 종료:${NC}"
echo "   docker-compose -f docker-compose.dev.yml down"
echo ""
echo -e "${BLUE}🌐 접속:${NC}"
echo "   http://localhost:3000"
echo ""

