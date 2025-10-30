#!/bin/bash
# NAS에서 Docker Compose TMPDIR 에러 해결 스크립트

set -e

echo "=========================================="
echo "Docker Compose 문제 진단 및 해결"
echo "=========================================="
echo ""

# 1. 현재 Docker Compose 버전 확인
echo "[1/6] Docker Compose 버전 확인..."
if command -v docker-compose &> /dev/null; then
    docker-compose --version
else
    echo "⚠️  docker-compose 명령이 없습니다."
fi

if docker compose version &> /dev/null; then
    echo "✅ Docker Compose V2 (플러그인) 사용 가능:"
    docker compose version
else
    echo "⚠️  Docker Compose V2 플러그인 없음"
fi
echo ""

# 2. 임시 디렉토리 확인
echo "[2/6] 임시 디렉토리 상태 확인..."
echo "TMPDIR: ${TMPDIR:-'(설정 안됨)'}"
echo "TEMP: ${TEMP:-'(설정 안됨)'}"
echo "TMP: ${TMP:-'(설정 안됨)'}"
echo ""
echo "/tmp 디렉토리:"
ls -ld /tmp || echo "❌ /tmp 접근 불가"
df -h /tmp || echo "❌ /tmp 정보 없음"
echo ""

# 3. 영구 임시 디렉토리 생성
echo "[3/6] NAS 영구 임시 디렉토리 생성..."
PERSISTENT_TMP="/volume1/tmp/docker-compose"
mkdir -p "$PERSISTENT_TMP"
chmod 777 "$PERSISTENT_TMP"
echo "✅ 생성됨: $PERSISTENT_TMP"
echo ""

# 4. 환경 변수 설정 파일 생성
echo "[4/6] 환경 변수 설정 파일 생성..."
ENV_FILE="/volume1/code_work/nas_naver_crawler/.docker-compose-env"
cat > "$ENV_FILE" << 'EOF'
# Docker Compose 환경 변수
export TMPDIR=/volume1/tmp/docker-compose
export TEMP=/volume1/tmp/docker-compose
export TMP=/volume1/tmp/docker-compose
export COMPOSE_TMP_PATH=/volume1/tmp/docker-compose
EOF
echo "✅ 생성됨: $ENV_FILE"
echo ""

# 5. 편리한 래퍼 스크립트 생성
echo "[5/6] Docker Compose 래퍼 스크립트 생성..."
WRAPPER_SCRIPT="/volume1/code_work/nas_naver_crawler/dc.sh"
cat > "$WRAPPER_SCRIPT" << 'EOFWRAPPER'
#!/bin/bash
# Docker Compose 래퍼 스크립트 (TMPDIR 문제 해결)

# 환경 변수 로드
export TMPDIR=/volume1/tmp/docker-compose
export TEMP=/volume1/tmp/docker-compose
export TMP=/volume1/tmp/docker-compose
export COMPOSE_TMP_PATH=/volume1/tmp/docker-compose

# 임시 디렉토리 생성 (존재하지 않을 경우)
mkdir -p "$TMPDIR"

# Docker Compose V2 (플러그인) 우선 사용
if docker compose version &> /dev/null; then
    echo "✅ Docker Compose V2 사용"
    docker compose "$@"
else
    echo "✅ Docker Compose V1 사용 (TMPDIR 설정)"
    docker-compose "$@"
fi
EOFWRAPPER

chmod +x "$WRAPPER_SCRIPT"
echo "✅ 생성됨: $WRAPPER_SCRIPT"
echo ""

# 6. 사용법 안내
echo "[6/6] 사용법"
echo "=========================================="
echo ""
echo "방법 1: 래퍼 스크립트 사용 (권장)"
echo "  cd /volume1/code_work/nas_naver_crawler"
echo "  ./dc.sh -f docker-compose.dev.yml restart web"
echo "  ./dc.sh -f docker-compose.dev.yml up -d"
echo "  ./dc.sh -f docker-compose.dev.yml logs -f web"
echo ""
echo "방법 2: 환경 변수 직접 로드"
echo "  source /volume1/code_work/nas_naver_crawler/.docker-compose-env"
echo "  docker-compose -f docker-compose.dev.yml restart web"
echo ""
echo "방법 3: Docker Compose V2 사용 (하이픈 없음)"
echo "  docker compose -f docker-compose.dev.yml restart web"
echo ""
echo "=========================================="
echo "✅ 설정 완료!"
echo "=========================================="
