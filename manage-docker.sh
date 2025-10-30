#!/bin/bash
# NAS용 Docker 관리 스크립트 (Docker Compose 우회)
# Synology NAS의 Docker Compose TMPDIR 문제 완전 해결

set -e

COMPOSE_FILE="${1:-docker-compose.dev.yml}"
COMMAND="${2:-help}"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 컨테이너 이름
WEB_CONTAINER="naver-crawler-web"
DB_CONTAINER="naver-crawler-db"
REDIS_CONTAINER="naver-crawler-redis"

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 도움말
show_help() {
    cat << EOF
========================================
NAS Docker 관리 스크립트
========================================

사용법: $0 [compose-file] [command]

명령어:
  start           전체 스택 시작
  stop            전체 스택 중지
  restart         전체 스택 재시작
  restart-web     웹 컨테이너만 재시작 (가장 빠름)
  restart-db      DB 컨테이너만 재시작
  restart-redis   Redis 컨테이너만 재시작
  logs            전체 로그 확인
  logs-web        웹 로그만 확인
  logs-db         DB 로그만 확인
  logs-redis      Redis 로그만 확인
  status          컨테이너 상태 확인
  clean           중지된 컨테이너 정리
  help            이 도움말 표시

예시:
  $0 docker-compose.dev.yml restart-web
  $0 docker-compose.dev.yml logs-web
  $0 docker-compose.dev.yml status

참고:
  - Docker Compose TMPDIR 문제를 완전히 우회합니다
  - docker 명령어를 직접 사용하여 안정적입니다
  - 빠른 재시작: restart-web (3초)

========================================
EOF
}

# 컨테이너 상태 확인
check_status() {
    echo_info "컨테이너 상태 확인 중..."
    echo ""
    docker ps -a --filter "name=naver-crawler" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# 전체 시작
start_all() {
    echo_info "전체 스택 시작 중..."

    # DB 시작
    if ! docker ps -q -f name=$DB_CONTAINER | grep -q .; then
        echo_info "DB 컨테이너 시작..."
        docker start $DB_CONTAINER 2>/dev/null || echo_warning "DB 컨테이너가 없습니다. Docker Compose로 먼저 생성하세요."
    else
        echo_success "DB 컨테이너 이미 실행 중"
    fi

    # Redis 시작
    if ! docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        echo_info "Redis 컨테이너 시작..."
        docker start $REDIS_CONTAINER 2>/dev/null || echo_warning "Redis 컨테이너가 없습니다. Docker Compose로 먼저 생성하세요."
    else
        echo_success "Redis 컨테이너 이미 실행 중"
    fi

    # Web 시작
    if ! docker ps -q -f name=$WEB_CONTAINER | grep -q .; then
        echo_info "웹 컨테이너 시작..."
        docker start $WEB_CONTAINER 2>/dev/null || echo_warning "웹 컨테이너가 없습니다. Docker Compose로 먼저 생성하세요."
    else
        echo_success "웹 컨테이너 이미 실행 중"
    fi

    echo ""
    echo_success "전체 스택 시작 완료!"
    check_status
}

# 전체 중지
stop_all() {
    echo_info "전체 스택 중지 중..."

    docker stop $WEB_CONTAINER 2>/dev/null || echo_warning "웹 컨테이너가 없습니다."
    docker stop $REDIS_CONTAINER 2>/dev/null || echo_warning "Redis 컨테이너가 없습니다."
    docker stop $DB_CONTAINER 2>/dev/null || echo_warning "DB 컨테이너가 없습니다."

    echo_success "전체 스택 중지 완료!"
    check_status
}

# 전체 재시작
restart_all() {
    echo_info "전체 스택 재시작 중..."

    docker restart $DB_CONTAINER 2>/dev/null || echo_warning "DB 컨테이너가 없습니다."
    sleep 2
    docker restart $REDIS_CONTAINER 2>/dev/null || echo_warning "Redis 컨테이너가 없습니다."
    sleep 1
    docker restart $WEB_CONTAINER 2>/dev/null || echo_warning "웹 컨테이너가 없습니다."

    echo_success "전체 스택 재시작 완료!"
    check_status
}

# 웹만 재시작 (가장 빠름)
restart_web() {
    echo_info "웹 컨테이너 재시작 중..."
    docker restart $WEB_CONTAINER
    echo_success "웹 컨테이너 재시작 완료! (3초)"
}

# DB만 재시작
restart_db() {
    echo_info "DB 컨테이너 재시작 중..."
    docker restart $DB_CONTAINER
    echo_success "DB 컨테이너 재시작 완료!"
}

# Redis만 재시작
restart_redis() {
    echo_info "Redis 컨테이너 재시작 중..."
    docker restart $REDIS_CONTAINER
    echo_success "Redis 컨테이너 재시작 완료!"
}

# 전체 로그
logs_all() {
    echo_info "전체 로그 확인 (Ctrl+C로 종료)..."
    docker logs -f $WEB_CONTAINER 2>&1 &
    docker logs -f $DB_CONTAINER 2>&1 &
    docker logs -f $REDIS_CONTAINER 2>&1 &
    wait
}

# 웹 로그
logs_web() {
    echo_info "웹 컨테이너 로그 확인 (Ctrl+C로 종료)..."
    docker logs -f $WEB_CONTAINER
}

# DB 로그
logs_db() {
    echo_info "DB 컨테이너 로그 확인 (Ctrl+C로 종료)..."
    docker logs -f $DB_CONTAINER
}

# Redis 로그
logs_redis() {
    echo_info "Redis 컨테이너 로그 확인 (Ctrl+C로 종료)..."
    docker logs -f $REDIS_CONTAINER
}

# 정리
clean() {
    echo_info "중지된 컨테이너 정리 중..."
    docker container prune -f
    echo_success "정리 완료!"
}

# 메인 로직
case "$COMMAND" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    restart-web)
        restart_web
        ;;
    restart-db)
        restart_db
        ;;
    restart-redis)
        restart_redis
        ;;
    logs)
        logs_all
        ;;
    logs-web)
        logs_web
        ;;
    logs-db)
        logs_db
        ;;
    logs-redis)
        logs_redis
        ;;
    status)
        check_status
        ;;
    clean)
        clean
        ;;
    help|*)
        show_help
        ;;
esac
