# NAS Docker Compose TMPDIR 에러 해결 가이드

## 문제 증상

```bash
docker-compose -f docker-compose.dev.yml restart web
[9027] INTERNAL ERROR: cannot create temporary directory!
```

## 근본 원인

- **Docker Compose V1**은 PyInstaller로 빌드된 단일 실행 파일
- 실행 시 `/tmp` 또는 `$TMPDIR`에 임시 파일을 추출해야 함
- Synology NAS의 `/tmp`가 tmpfs(메모리 파일시스템)로 제한되어 있거나 권한 문제 발생

## 해결책 (3가지 방법)

### 방법 1: 래퍼 스크립트 사용 (가장 간단, 권장)

프로젝트 루트에 `dc.sh` 래퍼 스크립트가 있습니다.

```bash
# NAS에서 실행
cd /volume1/code_work/nas_naver_crawler

# 기존 docker-compose 명령을 ./dc.sh로 대체
./dc.sh -f docker-compose.dev.yml restart web
./dc.sh -f docker-compose.dev.yml up -d
./dc.sh -f docker-compose.dev.yml logs -f web
./dc.sh -f docker-compose.dev.yml down
```

**장점:**
- 자동으로 TMPDIR 설정
- Docker Compose V2/V1 자동 감지
- 기존 명령어와 동일한 사용법

### 방법 2: Docker Compose V2 사용 (하이픈 없음)

Docker Compose V2 (CLI 플러그인)는 TMPDIR 문제가 없습니다.

```bash
# V1: docker-compose (하이픈, 에러 발생)
docker-compose -f docker-compose.dev.yml restart web  # ❌

# V2: docker compose (공백, 정상 작동)
docker compose -f docker-compose.dev.yml restart web  # ✅
```

**V2 설치 확인:**
```bash
docker compose version
```

출력 예시:
```
Docker Compose version v2.21.0
```

### 방법 3: 환경 변수 직접 설정

매번 명령 실행 전에 환경 변수 설정:

```bash
# 영구 임시 디렉토리 생성
mkdir -p /volume1/tmp/docker-compose
chmod 777 /volume1/tmp/docker-compose

# 환경 변수 설정
export TMPDIR=/volume1/tmp/docker-compose

# Docker Compose 실행
docker-compose -f docker-compose.dev.yml restart web
```

**셸 시작 시 자동 로드:**
```bash
# ~/.bashrc 또는 ~/.profile에 추가
echo 'export TMPDIR=/volume1/tmp/docker-compose' >> ~/.bashrc
source ~/.bashrc
```

## 자동 설정 스크립트

모든 설정을 자동으로 수행하는 스크립트:

```bash
cd /volume1/code_work/nas_naver_crawler
chmod +x scripts/fix-nas-docker-compose.sh
./scripts/fix-nas-docker-compose.sh
```

이 스크립트는:
1. 현재 Docker Compose 버전 확인
2. 영구 임시 디렉토리 생성 (`/volume1/tmp/docker-compose`)
3. 환경 변수 설정 파일 생성 (`.docker-compose-env`)
4. 래퍼 스크립트 생성 (`dc.sh`)
5. 사용법 안내 출력

## 권장 사용법

### 일반 작업

```bash
cd /volume1/code_work/nas_naver_crawler

# 컨테이너 재시작
./dc.sh -f docker-compose.dev.yml restart web

# 전체 스택 실행
./dc.sh -f docker-compose.dev.yml up -d

# 로그 확인
./dc.sh -f docker-compose.dev.yml logs -f web

# 중지
./dc.sh -f docker-compose.dev.yml down
```

### Git Pull 후 배포

```bash
cd /volume1/code_work/nas_naver_crawler
git pull origin main
./dc.sh -f docker-compose.dev.yml restart web  # 3초 재시작!
```

### 환경 변수 변경 후

```bash
# .env.local 수정 후
./dc.sh -f docker-compose.dev.yml down
./dc.sh -f docker-compose.dev.yml up -d
```

## 기술적 상세

### Docker Compose V1 vs V2

| 항목 | V1 (docker-compose) | V2 (docker compose) |
|------|---------------------|---------------------|
| 설치 방식 | Python standalone | Docker CLI plugin |
| 명령어 | `docker-compose` (하이픈) | `docker compose` (공백) |
| TMPDIR 문제 | ✅ 발생 가능 | ❌ 없음 |
| 개발 상태 | 지원 종료 (2023) | 활발히 개발 중 |
| 권장 여부 | ❌ | ✅ |

### TMPDIR 환경 변수 우선순위

1. `$TMPDIR` (Linux/macOS 표준)
2. `$TEMP` (Windows 호환)
3. `$TMP` (범용)
4. `/tmp` (시스템 기본)

Synology NAS에서는 `/tmp`가 제한적이므로 `/volume1/tmp`를 사용합니다.

## 문제 해결

### 여전히 에러가 발생하는 경우

```bash
# 1. 임시 디렉토리 권한 확인
ls -ld /volume1/tmp/docker-compose

# 2. 수동으로 권한 부여
chmod 777 /volume1/tmp/docker-compose

# 3. 환경 변수 확인
echo $TMPDIR

# 4. Docker Compose V2 사용 시도
docker compose -f docker-compose.dev.yml restart web
```

### dc.sh가 작동하지 않는 경우

```bash
# 실행 권한 부여
chmod +x dc.sh

# 직접 실행
bash dc.sh -f docker-compose.dev.yml restart web
```

## 참고 자료

- [Docker Compose V2 마이그레이션 가이드](https://docs.docker.com/compose/migrate/)
- [Synology Docker 패키지](https://www.synology.com/en-global/dsm/packages/Docker)
- [PyInstaller TMPDIR 이슈](https://github.com/pyinstaller/pyinstaller/issues)

## 요약

**가장 간단한 해결책:**
```bash
cd /volume1/code_work/nas_naver_crawler
./dc.sh -f docker-compose.dev.yml restart web
```

`docker-compose` 대신 `./dc.sh`를 사용하면 모든 TMPDIR 문제가 자동으로 해결됩니다! 🎉
