# NAS 환경용 최적화 Dockerfile (systemd 문제 해결)
FROM python:3.11-slim

# 환경변수 설정
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# systemd 관련 패키지를 피하고 필수 패키지만 설치
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    --fix-missing \
    ca-certificates \
    wget \
    gnupg \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libxss1 \
    libgconf-2-4 \
    libxtst6 \
    libxrandr2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgdk-pixbuf2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libxext6 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Playwright 브라우저 설치 (시스템 의존성과 함께)
RUN playwright install chromium --with-deps

# 애플리케이션 파일 복사
COPY . .

# 필요한 디렉토리 생성
RUN mkdir -p crawled_data logs \
    && chmod +x nas_playwright_crawler.py

CMD ["python", "nas_playwright_crawler.py"]
