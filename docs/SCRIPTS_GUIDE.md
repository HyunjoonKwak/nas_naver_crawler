# 📜 스크립트 사용 가이드

**버전**: v2.11.0+
**작성일**: 2025-11-01

---

## 📋 개요

이 프로젝트는 **3개의 주요 스크립트**를 제공하며, 각각 명확히 구분된 역할을 가지고 있습니다.

---

## 🎯 스크립트 역할 비교

| 스크립트 | 주 용도 | 실행 방식 | 사용 시점 |
|---------|---------|----------|----------|
| **deploy-to-nas.sh** | NAS 배포 자동화 | `./deploy-to-nas.sh [dev\|prod]` | 코드 업데이트 후 배포 |
| **switch-mode-safe.sh** | 모드 전환 전용 | `./scripts/switch-mode-safe.sh` | 개발↔프로덕션 전환 |
| **manage.sh** | 일상 운영 관리 | `./manage.sh` (대화형 메뉴) | 로그 확인, 재시작 등 |

---

## 1️⃣ deploy-to-nas.sh (배포 자동화)

### **목적**
NAS에 코드를 배포하고 자동 검증을 수행합니다.

### **사용법**
```bash
# 자동 감지 (현재 실행 중인 모드로 배포) ⭐ 권장
./deploy-to-nas.sh

# 명시적 지정 - 개발 모드로 배포
./deploy-to-nas.sh dev

# 명시적 지정 - 프로덕션 모드로 배포
./deploy-to-nas.sh prod
```

**💡 Tip**: 인자 없이 실행하면 현재 실행 중인 모드를 자동 감지하여 같은 모드로 재배포합니다!

### **주요 기능**
1. 사전 체크
   - Docker, Docker Compose 설치 확인
   - config.env 파일 존재 확인
   - .env 심볼릭 링크 생성

2. Git 상태 확인
   - 현재 브랜치, 커밋 해시 표시
   - Uncommitted changes 경고

3. 환경별 배포
   - **개발 모드**: 컨테이너 재시작만 (3초 완료)
   - **프로덕션 모드**: 빌드 → 시작 (10~15분 소요)

4. **자동 검증 (5단계)**
   - 컨테이너 시작 대기
   - 웹 컨테이너 상태 확인
   - NODE_ENV 검증
   - DB 연결 확인
   - Redis 연결 확인

### **예상 출력**

#### **자동 감지 모드 (인자 없음)**
```bash
$ ./deploy-to-nas.sh

🔍 자동 감지: 현재 dev 모드 실행 중

======================================================================
  NAS 배포 스크립트 v2.12.0
  모드: 자동 감지 → dev
  시작 시간: 2025-11-01 14:30:00
======================================================================

ℹ️  Step 1: 사전 요구사항 체크 중...
✅ Docker 확인 완료
✅ Docker Compose 확인 완료
✅ config.env 파일 확인 완료

ℹ️  Step 2: Git 상태 확인 중...
ℹ️  현재 브랜치: main
ℹ️  커밋 해시: 780bdd6
✅ Git 상태 깨끗함

ℹ️  Step 3: 개발 환경 배포 시작 (Hot Reload)...
ℹ️  컨테이너 재시작 중...
✅ 컨테이너 재시작 완료 (Hot Reload 활성화)

ℹ️  Step 4: 배포 검증 중...

ℹ️  검증 1/5: 컨테이너 시작 대기 중...
ℹ️  검증 2/5: 컨테이너 상태 확인 중...
✅ 웹 컨테이너 정상 실행 중
ℹ️  검증 3/5: NODE_ENV 확인 중...
✅ NODE_ENV=development (개발 모드)
ℹ️  검증 4/5: 데이터베이스 연결 확인 중...
✅ 데이터베이스 컨테이너 정상 실행 중
ℹ️  검증 5/5: Redis 연결 확인 중...
✅ Redis 컨테이너 정상 실행 중

🎉 모든 검증 통과!

======================================================================
  🎉 배포 완료!
======================================================================

📊 배포 정보:
  - 환경: dev
  - 버전: v2.12.0
  - 완료 시간: 2025-11-01 14:30:10

🔗 접속 정보:
  - URL: http://192.168.0.100:3000
  - 또는: http://localhost:3000
======================================================================
```

#### **실행 중인 컨테이너 없을 때**
```bash
$ ./deploy-to-nas.sh

⚠️  실행 중인 컨테이너가 없습니다.

어떤 모드로 배포하시겠습니까?
  1) dev  - 개발 모드 (Hot Reload, 3초)
  2) prod - 프로덕션 모드 (최적화, 10~15분)

선택 (1-2): 1

======================================================================
  NAS 배포 스크립트 v2.12.0
  모드: 자동 감지 → dev
  시작 시간: 2025-11-01 14:30:00
======================================================================
...
```

### **언제 사용하나요?**
- ✅ Git pull 후 코드를 배포할 때
- ✅ 초기 NAS 설정 시
- ✅ 전체 재배포가 필요할 때

### **언제 사용하지 말아야 하나요?**
- ❌ 단순 재시작 (manage.sh 사용)
- ❌ 모드만 전환 (switch-mode-safe.sh 사용)
- ❌ 로그만 확인 (manage.sh 사용)

---

## 2️⃣ switch-mode-safe.sh (모드 전환)

### **목적**
개발 모드 ↔ 프로덕션 모드 안전하게 전환합니다.

### **사용법**
```bash
./scripts/switch-mode-safe.sh
```

### **주요 기능**
1. **현재 모드 자동 감지**
   - 실행 중인 컨테이너 확인
   - 현재 compose 파일 파악

2. **대화형 프롬프트**
   - 전환할 모드 설명
   - 주의사항 안내
   - 사용자 확인 요청

3. **안전한 전환**
   - Git 파일 수정 없음
   - 별도 compose 파일 사용
   - 완전한 구성 전환

4. **자동 검증 (5단계)**
   - deploy-to-nas.sh와 동일한 검증

### **예상 출력**
```bash
$ ./scripts/switch-mode-safe.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  안전한 모드 전환 v3.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

현재 모드: 🚀 프로덕션 모드
실행 파일: docker-compose.prod.yml

개발 모드로 전환하시겠습니까?

개발 모드:
  ✓ Hot Reload 활성화 (코드 수정 즉시 반영)
  ✓ 빌드 불필요 (3~5초 시작)
  ✓ 개발 편의성 향상
  ✓ 디버깅 편리
  ✗ 메모리 사용량 증가
  ✗ 프로덕션 최적화 없음

⚠️  주의사항:
  - 실행 중인 크롤링 작업이 중단됩니다
  - 개발 모드 시작 시간: 3~5초

계속하시겠습니까? (y/N): y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
모드 전환 시작
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  기존 컨테이너 중지 중...
✅ 컨테이너 중지 완료

2️⃣  개발 모드 컨테이너 시작 중...
✅ 컨테이너 시작 완료!

4️⃣  배포 검증 중...

검증 1/5: 컨테이너 시작 대기 중...
검증 2/5: 컨테이너 상태 확인 중...
✅ 웹 컨테이너 정상 실행 중
검증 3/5: NODE_ENV 확인 중...
✅ NODE_ENV=development (개발 모드)
검증 4/5: 데이터베이스 연결 확인 중...
✅ 데이터베이스 컨테이너 정상 실행 중
검증 5/5: Redis 연결 확인 중...
✅ Redis 컨테이너 정상 실행 중

🎉 모든 검증 통과!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 모드 전환 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  개발 모드 활성화
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  모드: 🔧 개발 모드 (Hot Reload)
  파일: docker-compose.yml

🌐 웹 UI: http://localhost:3000
💡 Hot Reload: 코드 수정 시 자동 반영 (3-5초)

다음 단계:
  1. 코드 수정
  2. 브라우저에서 확인 (자동 반영)
  3. 검증 완료 후 git commit
  4. 프로덕션 재배포: ./scripts/switch-mode-safe.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### **언제 사용하나요?**
- ✅ **시나리오 3 (버그 수정 워크플로)**
  ```bash
  # 1. 프로덕션에서 버그 발견
  ./scripts/switch-mode-safe.sh  # → 개발 모드 전환

  # 2. 코드 수정 (Hot Reload로 즉시 확인)
  vi app/api/some-route/route.ts

  # 3. 검증 완료
  git add . && git commit -m "fix: 버그 수정"

  # 4. 프로덕션 복귀
  ./scripts/switch-mode-safe.sh  # → 프로덕션 모드 전환
  ```

- ✅ 성능 테스트 전 프로덕션 모드로 전환
- ✅ 개발 편의를 위해 임시로 개발 모드 전환

### **언제 사용하지 말아야 하나요?**
- ❌ 전체 배포 (deploy-to-nas.sh 사용)
- ❌ 단순 재시작 (manage.sh 사용)

---

## 3️⃣ manage.sh (일상 운영 관리)

### **목적**
대화형 메뉴로 일상적인 서버 관리 작업을 수행합니다.

### **사용법**
```bash
./manage.sh
```

### **주요 기능**

#### **기본 제어**
1. **🚀 시작** - 서버 시작 (모드 선택 가능)
2. **🛑 종료** - 서버 종료
3. **🔄 재시작** - 빠른 재시작
4. **📊 상태 확인** - 상세 상태 (리소스, 헬스체크)
5. **📝 로그 보기 (실시간)** - `docker logs -f`
6. **📜 로그 보기 (최근 100줄)** - `docker logs --tail=100`

#### **모드 관리**
7. **🔀 모드 전환** - switch-mode-safe.sh 실행

#### **관리**
8. **🗑️ 데이터 정리** - 크롤링 데이터/로그 삭제
9. **🔍 Docker 정보** - 네트워크, 볼륨, 이미지, 디스크 사용량
10. **🧹 캐시 정리** - .next 디렉토리 삭제

### **메뉴 화면**
```bash
$ ./manage.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  네이버 부동산 크롤러 관리 메뉴 v2.2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

● 상태: 실행 중
  컨테이너: naver-crawler-web
  모드: 🔧 개발 모드 (Hot Reload)
  Compose: docker-compose.yml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

=== 기본 제어 ===
  1) 🚀 시작
  2) 🛑 종료
  3) 🔄 재시작
  4) 📊 상태 확인 (상세)
  5) 📝 로그 보기 (실시간)
  6) 📜 로그 보기 (최근 100줄)

=== 모드 관리 ===
  7) 🔀 모드 전환 (개발 ↔ 프로덕션)

=== 관리 ===
  8) 🗑️  데이터 정리
  9) 🔍 Docker 정보
 10) 🧹 캐시 정리 (.next 삭제)

=== 기타 ===
  0) 🚪 종료

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

선택하세요:
```

### **상세 기능 예시**

#### **4) 📊 상태 확인**
```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  실행 중
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

모드: 🔧 개발 모드 (Hot Reload)
  - Compose: docker-compose.yml
  - Dockerfile: Dockerfile
  - 명령어: npm run dev
  - Hot Reload: 활성화

=== 컨테이너 상태 ===
NAME                    STATUS          PORTS
naver-crawler-web       Up 2 hours      0.0.0.0:3000->3000/tcp
naver-crawler-db        Up 2 hours      5432/tcp
naver-crawler-redis     Up 2 hours      6379/tcp

=== 리소스 사용량 ===
CONTAINER               CPU %    MEM USAGE / LIMIT     MEM %
naver-crawler-web       0.5%     450MiB / 4GiB         11.25%
naver-crawler-db        0.1%     50MiB / 16GiB         0.31%
naver-crawler-redis     0.2%     20MiB / 16GiB         0.12%

=== 헬스체크 ===
상태: ✅ Healthy

=== 크롤링 데이터 ===
크롤링된 파일: 15개

최신 3개 파일:
  crawled_data/complex_22065_20251101.json (125K)
  crawled_data/complex_22064_20251101.json (98K)
  crawled_data/complex_22063_20251101.json (110K)

=== 데이터베이스 ===
PostgreSQL: ✅ 실행 중
Redis: ✅ 실행 중
```

#### **5) 📝 로그 보기 (실시간)**
```bash
🔧 개발 모드 로그 (Ctrl+C로 종료)
  - Hot Reload 활성화
  - 실시간 로그 스트리밍

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

오후 2:35:10 INFO[API] GET /api/complexes 200 (45ms)
오후 2:35:12 INFO[CRAWLER] Starting crawler for complex 22065
오후 2:35:15 INFO[CRAWLER] Scrolling... (800px)
오후 2:35:18 INFO[CRAWLER] Found 25 articles
오후 2:35:20 INFO[CRAWLER] Completed successfully
...
```

#### **8) 🗑️ 데이터 정리**
```bash
⚠️  주의: 데이터를 정리합니다!

정리 옵션:
  1) 크롤링 데이터만 삭제 (crawled_data/*.json)
  2) 로그만 삭제 (logs/)
  3) 모두 삭제
  0) 취소

선택 (0-3): 1
크롤링 데이터를 삭제하시겠습니까? (y/N): y
✅ 크롤링 데이터 삭제 완료
```

#### **9) 🔍 Docker 정보**
```bash
=== Docker 버전 ===
Docker version 24.0.6
Docker Compose version v2.23.0

=== 네트워크 ===
crawler-network    bridge    local

=== 볼륨 ===
postgres_data      local
redis_data         local

=== 이미지 ===
REPOSITORY                TAG       IMAGE ID       SIZE
naver-crawler-web         latest    abc123def456   1.2GB
postgres                  16-alpine def456ghi789   250MB
redis                     7-alpine  ghi789jkl012   35MB

=== 디스크 사용량 ===
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          3         3         1.5GB     0B (0%)
Containers      3         3         50MB      0B (0%)
Local Volumes   2         2         500MB     0B (0%)
Build Cache     0         0         0B        0B
```

### **언제 사용하나요?**
- ✅ 로그를 빠르게 확인하고 싶을 때
- ✅ 서버를 재시작하고 싶을 때
- ✅ 리소스 사용량을 확인하고 싶을 때
- ✅ 캐시를 정리하고 싶을 때
- ✅ Docker 상태를 점검하고 싶을 때

### **언제 사용하지 말아야 하나요?**
- ❌ 코드 업데이트 후 배포 (deploy-to-nas.sh 사용)
- ❌ 모드 전환만 필요한 경우 (switch-mode-safe.sh 직접 사용도 가능)

---

## 🎯 실전 시나리오

### **시나리오 1: 초기 NAS 설정**
```bash
# 1. Git clone
git clone https://github.com/username/nas-naver-crawler.git
cd nas-naver-crawler

# 2. 환경 변수 설정
cp config.env.example config.env
vi config.env  # API 키 입력

# 3. 개발 모드로 배포
./deploy-to-nas.sh dev
```

---

### **시나리오 2: 코드 업데이트 배포 (자동 감지) ⭐**
```bash
# NAS SSH 접속
ssh admin@192.168.0.100
cd /volume1/docker/naver-crawler

# Git pull
git pull origin main

# 자동 감지로 재배포 (현재 모드 유지)
./deploy-to-nas.sh
# → 개발 모드 실행 중이면 개발 모드로 배포
# → 프로덕션 모드 실행 중이면 프로덕션 모드로 배포
```

---

### **시나리오 3: 버그 수정 워크플로**
```bash
# 1. 프로덕션 실행 중

# 2. 버그 발견 → 개발 모드로 전환
./scripts/switch-mode-safe.sh
# → 개발 모드 선택

# 3. 코드 수정 (Hot Reload로 즉시 반영)
vi app/api/complexes/route.ts
# 브라우저에서 확인 (3-5초 후 자동 반영)

# 4. 수정 완료 → Git commit
git add .
git commit -m "fix: 단지 목록 API 에러 수정"

# 5. 프로덕션 모드로 복귀
./scripts/switch-mode-safe.sh
# → 프로덕션 모드 선택
```

---

### **시나리오 4: 로그 확인 및 재시작**
```bash
# manage.sh 실행
./manage.sh

# 메뉴 선택
5) 📝 로그 보기 (실시간)
# 로그 확인 후 Ctrl+C

# 문제 발견 시 재시작
3) 🔄 재시작
```

---

### **시나리오 5: 프로덕션 모드로 최적화 배포**
```bash
# 성능 최적화가 필요한 경우
./deploy-to-nas.sh prod

# 소요 시간: 10~15분
# - Next.js 빌드 최적화
# - 프로덕션 의존성만 설치
# - 메모리 사용량 30% 감소
```

---

## 🔍 스크립트 선택 가이드

### **"배포하고 싶어요"**
→ `./deploy-to-nas.sh [dev|prod]`

### **"모드만 바꾸고 싶어요"**
→ `./scripts/switch-mode-safe.sh`

### **"로그만 보고 싶어요"**
→ `./manage.sh` → 메뉴 5 또는 6

### **"재시작하고 싶어요"**
→ `./manage.sh` → 메뉴 3

### **"상태 확인하고 싶어요"**
→ `./manage.sh` → 메뉴 4

### **"캐시를 정리하고 싶어요"**
→ `./manage.sh` → 메뉴 10

---

## ⚠️ 주의사항

### **1. Git 파일 수정 금지**
- ❌ `docker-compose.yml` 직접 수정하지 마세요
- ❌ `sed -i`로 파일 변경하지 마세요
- ✅ 별도 compose 파일 사용 (`docker-compose.prod.yml`)

### **2. 모드 전환 시 주의**
- 실행 중인 크롤링 작업 중단됨
- 프로덕션 빌드 시 10~15분 소요
- 데이터는 유지됨 (볼륨 공유)

### **3. 스크립트 실행 권한**
```bash
# 권한 없음 에러 시
chmod +x deploy-to-nas.sh
chmod +x scripts/switch-mode-safe.sh
chmod +x manage.sh
```

---

## 📚 관련 문서

- **[PRODUCTION_MODE_GUIDE.md](../PRODUCTION_MODE_GUIDE.md)** - 프로덕션 모드 상세 가이드
- **[DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md)** - 자동 검증 설명
- **[MODE_SWITCHING_ANALYSIS.md](../MODE_SWITCHING_ANALYSIS.md)** - 모드 전환 안전성 분석
- **[NAS_DEPLOYMENT_GUIDE.md](NAS_DEPLOYMENT_GUIDE.md)** - NAS 배포 전체 가이드

---

**Made with ❤️ for NAS users**
