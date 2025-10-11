# 최종 Playwright 버전 - Playwright가 자동으로 의존성 설치
FROM python:3.11-slim

# 환경변수 설정
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# 기본 패키지 및 대체 폰트 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    curl \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-unifont \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    pandas==2.1.4 \
    python-dotenv==1.0.0 \
    aiohttp==3.9.1 \
    loguru==0.7.2 \
    playwright==1.40.0

# Playwright 브라우저만 설치 (의존성은 수동으로)
RUN playwright install chromium

# Playwright 의존성을 수동으로 설치 (폰트 제외)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libexpat1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 애플리케이션 파일 복사
COPY . .

# 필요한 디렉토리 생성
RUN mkdir -p crawled_data logs && \
    chmod +x nas_playwright_crawler.py

CMD ["python", "nas_playwright_crawler.py"]
