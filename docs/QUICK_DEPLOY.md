# 🚀 빠른 배포 가이드

NAS에서 이미지 빌드가 느릴 때 사용하는 방법들입니다.

---

## 방법 1: Mac에서 빌드 후 전송 ⭐ 추천

### 장점
- ✅ Mac의 빠른 CPU로 빌드 (5배 이상 빠름)
- ✅ NAS 리소스 절약
- ✅ 프로덕션 이미지 사용

### 사용법

```bash
# Mac에서 실행
cd /Users/specialrisk_mac/code_work/nas_naver_crawler
./scripts/build_and_export.sh
```

스크립트가 자동으로:
1. Mac에서 Docker 이미지 빌드
2. 이미지를 tar 파일로 저장
3. NAS로 SCP 전송
4. NAS에서 이미지 로드

완료 후 NAS에서:
```bash
ssh admin@[NAS-IP]
cd /volume1/code_work/nas_naver_crawler
docker-compose up -d
```

### 예상 시간
- Mac 빌드: 3-5분
- 전송: 2-3분 (네트워크 속도에 따라)
- **총: 5-8분**

---

## 방법 2: 개발 모드 ⭐ 가장 빠름

### 장점
- ✅ 빌드 불필요
- ✅ 소스 코드 실시간 반영
- ✅ Hot reload 지원
- ✅ 테스트에 최적

### 사용법

```bash
# NAS에서 실행
cd /volume1/code_work/nas_naver_crawler
./scripts/dev_mode.sh
```

또는 직접:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 로그 확인
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### 재시작
```bash
docker-compose -f docker-compose.dev.yml restart
```

### 종료
```bash
docker-compose -f docker-compose.dev.yml down
```

### 예상 시간
- 첫 실행: 5-10분 (npm install 포함)
- 이후: 10초

---

## 방법 3: GitHub Actions 자동 빌드 (선택)

### 설정 방법

1. GitHub Actions 워크플로우 생성:

`.github/workflows/docker-build.yml`:
```yaml
name: Build Docker Image

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: yourusername/naver-crawler:latest
```

2. NAS에서 pull:
```bash
docker pull yourusername/naver-crawler:latest
docker tag yourusername/naver-crawler:latest naver-crawler:latest
docker-compose up -d
```

---

## 방법 비교

| 방법 | 첫 실행 | 이후 업데이트 | 프로덕션 | 개발 |
|------|---------|--------------|---------|-----|
| Mac → NAS 전송 | 5-8분 | 5-8분 | ✅ | ⚠️ |
| 개발 모드 | 5-10분 | 10초 | ⚠️ | ✅ |
| GitHub Actions | 5-10분 | 2-3분 | ✅ | ❌ |
| NAS 직접 빌드 | 15-30분 | 15-30분 | ✅ | ❌ |

---

## 🎯 추천 워크플로우

### 개발 중
```bash
# NAS에서 개발 모드 실행
./scripts/dev_mode.sh

# 코드 수정 후 자동 반영 확인
# 문제 없으면 git push
```

### 프로덕션 배포
```bash
# Mac에서 빌드 후 전송
./scripts/build_and_export.sh

# NAS에서 프로덕션 모드 실행
docker-compose up -d
```

---

## 📝 팁

### 개발 모드 주의사항
- `NODE_ENV=development`로 실행됨
- Next.js 최적화 없음 (느릴 수 있음)
- 테스트 후 반드시 프로덕션 빌드로 확인

### 빌드 캐시 활용
Mac에서 빌드 시 Docker 캐시 활용:
```bash
# --no-cache 없이 빌드
docker-compose build
```

### 네트워크 최적화
Mac과 NAS가 같은 네트워크에 있으면 전송이 더 빠릅니다.

---

**빠른 개발을 위해 개발 모드를 사용하고, 배포 시에는 Mac에서 빌드 후 전송하세요! 🚀**

