# NAS 환경 설정 가이드

## Docker Compose TMPDIR 에러 해결

### 문제 증상
```bash
docker-compose -f docker-compose.dev.yml restart web
[9027] INTERNAL ERROR: cannot create temporary directory!
```

### 근본 원인
- **Docker Compose V1**은 PyInstaller로 빌드된 단일 실행 파일
- 실행 시 `/tmp`에 Python 라이브러리 압축 해제 필요
- Synology NAS의 `/tmp`는 tmpfs (메모리 파일시스템)로 제한적
- `/tmp`가 `noexec`로 마운트되어 실행 파일 생성 불가

### 해결책: Docker Compose V2 설치

Docker Compose V2는 Go 언어로 빌드되어 TMPDIR 문제가 없습니다.

#### 1. V2 다운로드 및 설치

```bash
cd /volume1/code_work/nas_naver_crawler

# V2 다운로드
curl -SL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 -o docker-compose-v2

# 실행 권한
chmod +x docker-compose-v2

# 버전 확인
./docker-compose-v2 version
```

#### 2. 사용 방법

```bash
# 기본 사용
./docker-compose-v2 -f docker-compose.dev.yml restart web
./docker-compose-v2 -f docker-compose.dev.yml logs -f web
./docker-compose-v2 -f docker-compose.dev.yml up -d
```

#### 3. 편리하게 사용하기 (선택사항)

**방법 A: 심볼릭 링크**
```bash
sudo ln -sf /volume1/code_work/nas_naver_crawler/docker-compose-v2 /usr/local/bin/docker-compose

# 이제 기존 명령어 사용 가능
docker-compose -f docker-compose.dev.yml restart web
```

**방법 B: 별칭(alias)**
```bash
echo 'alias docker-compose="/volume1/code_work/nas_naver_crawler/docker-compose-v2"' >> ~/.bashrc
source ~/.bashrc

# docker-compose 명령어가 V2로 실행됨
docker-compose -f docker-compose.dev.yml restart web
```

---

## 환경 변수 설정 (최초 1회 필수!)

### Naver Maps API 키 설정

`docker-compose.dev.yml` 파일을 **NAS에서 직접** 수정하세요:

```bash
cd /volume1/code_work/nas_naver_crawler

# 파일 편집
vi docker-compose.dev.yml
```

**수정할 부분** (69-71줄 주석 해제):
```yaml
# Before (주석 상태)
# - NAVER_MAPS_CLIENT_ID=your_client_id
# - NAVER_MAPS_CLIENT_SECRET=your_client_secret

# After (주석 해제하고 실제 키 입력)
- NAVER_MAPS_CLIENT_ID=실제_클라이언트_ID
- NAVER_MAPS_CLIENT_SECRET=실제_시크릿_키
```

**⚠️ 중요**:
- 이 파일 변경사항은 **Git에 커밋하지 마세요!**
- NAS에서만 수정하고 사용하세요.

### 컨테이너 재시작 (환경 변수 적용)

```bash
# 재시작
./docker-compose-v2 -f docker-compose.dev.yml down
./docker-compose-v2 -f docker-compose.dev.yml up -d

# 환경 변수 확인
docker exec naver-crawler-web env | grep NAVER
```

---

## Git Pull & 배포 워크플로우

### 코드 업데이트 후 배포

```bash
cd /volume1/code_work/nas_naver_crawler

# 1. 로컬 변경사항 임시 저장 (API 키 보호)
git stash

# 2. Git pull
git pull origin main

# 3. 로컬 변경사항 복구 (API 키 복원)
git stash pop

# 4. API 키가 그대로 있는지 확인
grep "NAVER_MAPS_CLIENT_ID" docker-compose.dev.yml

# 5. 웹 컨테이너 재시작 (3초!)
./docker-compose-v2 -f docker-compose.dev.yml restart web

# 6. 로그 확인
./docker-compose-v2 -f docker-compose.dev.yml logs -f web
```

**충돌이 발생하면**:
```bash
# 충돌 해결 후 API 키 다시 입력
vi docker-compose.dev.yml
# (69-71줄에 API 키 추가)

./docker-compose-v2 -f docker-compose.dev.yml restart web
```

### 환경 변수 변경 후 배포

```bash
# 1. config.env 수정
vi config.env

# 2. 컨테이너 재생성 (환경 변수 적용)
./docker-compose-v2 -f docker-compose.dev.yml down
./docker-compose-v2 -f docker-compose.dev.yml up -d
```

## 문제 해결

### V2도 에러가 발생하는 경우

Docker 명령어로 직접 제어:

```bash
# 재시작
docker restart naver-crawler-web

# 로그
docker logs -f naver-crawler-web

# 상태 확인
docker ps -a | grep naver-crawler
```

### 용량 부족 에러

```bash
# Docker 정리
docker system prune -a

# 사용하지 않는 볼륨 정리
docker volume prune
```

## 참고

- Docker Compose V1: Python + PyInstaller (TMPDIR 필요)
- Docker Compose V2: Go 언어 (TMPDIR 불필요)
- V2가 공식 권장 버전 (V1은 2023년 지원 종료)
