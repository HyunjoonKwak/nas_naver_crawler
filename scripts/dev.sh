#!/bin/bash
# 로컬 개발 환경 실행 스크립트

echo "=========================================="
echo "개발 환경 시작"
echo "=========================================="

# 디렉토리 확인
mkdir -p crawled_data logs

# Next.js 개발 서버 시작
echo "Next.js 개발 서버 시작 중..."
npm run dev

# 서버가 종료되면
echo ""
echo "개발 서버가 종료되었습니다."

