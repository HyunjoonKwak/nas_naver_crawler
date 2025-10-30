#!/bin/bash
# Docker Compose 래퍼 스크립트 (NAS TMPDIR 문제 해결)

# 환경 변수 설정
export TMPDIR=/volume1/tmp/docker-compose
export TEMP=/volume1/tmp/docker-compose
export TMP=/volume1/tmp/docker-compose
export COMPOSE_TMP_PATH=/volume1/tmp/docker-compose

# 임시 디렉토리 생성 (존재하지 않을 경우)
mkdir -p "$TMPDIR" 2>/dev/null || true

# Docker Compose V2 (플러그인) 우선 사용
if docker compose version &> /dev/null; then
    # V2 사용 (docker compose - 공백)
    docker compose "$@"
else
    # V1 사용 (docker-compose - 하이픈)
    docker-compose "$@"
fi
