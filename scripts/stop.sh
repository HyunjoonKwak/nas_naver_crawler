#!/bin/bash
# 웹서버 빠른 종료 스크립트

echo "웹서버 종료 중..."
docker-compose down

if [ $? -eq 0 ]; then
    echo "✅ 웹서버 종료 완료!"
else
    echo "❌ 웹서버 종료 실패!"
    exit 1
fi

