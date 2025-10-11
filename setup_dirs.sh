#!/bin/bash
# 필요한 디렉토리 생성 스크립트

echo "필요한 디렉토리 생성 중..."

# 디렉토리 생성
mkdir -p crawled_data
mkdir -p logs

# 권한 설정
chmod 755 crawled_data
chmod 755 logs

echo "✅ 디렉토리 생성 완료!"
echo ""
echo "생성된 디렉토리:"
ls -la | grep -E "crawled_data|logs"
