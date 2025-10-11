# NAS 환경용 네이버 부동산 크롤러 Docker 이미지
FROM python:3.11-slim

# 환경변수 설정 (debconf 문제 해결)
ENV DEBIAN_FRONTEND=noninteractive \
    TERM=xterm \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 패키지 설치 (NAS 환경 최적화)
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    --no-install-suggests \
    --fix-missing \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Python 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Playwright 브라우저 설치 (NAS 환경 최적화)
RUN playwright install chromium --with-deps \
    && playwright install-deps chromium

# 애플리케이션 파일 복사
COPY . .

# 필요한 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/crawled_data /app/logs \
    && chmod +x nas_playwright_crawler.py scheduler.py \
    && chmod 755 /app/crawled_data /app/logs

# 사용자 생성 (보안 강화)
RUN groupadd -r crawler && useradd -r -g crawler crawler \
    && chown -R crawler:crawler /app
USER crawler

# 헬스체크 추가 (간소화)
HEALTHCHECK --interval=60s --timeout=30s --start-period=10s --retries=3 \
    CMD python -c "import os; exit(0 if os.path.exists('/app/crawled_data') else 1)" || exit 1

# 기본 명령어
CMD ["python", "nas_playwright_crawler.py"]
