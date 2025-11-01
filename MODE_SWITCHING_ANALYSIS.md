# 🔍 개발/프로덕션 모드 전환 심층 분석 및 문제점

**작성일**: 2025-11-01
**목적**: 모드 전환 시 발생 가능한 모든 문제점 사전 분석

---

## ⚠️ 심각한 문제 발견!

### 문제 1: **Docker Compose 파일 구조 불일치** 🔥

#### 현재 상태:
```bash
# 파일 구조
docker-compose.yml          → Dockerfile.dev 사용 (개발 모드)
docker-compose.dev.yml      → Dockerfile.dev 사용 (개발 모드) - 동일
docker-compose.prod.yml     → Dockerfile.prod 사용 (프로덕션 모드) 🆕
docker-compose.test.yml     → 테스트 환경용 (별도)
```

#### 기존 switch-mode.sh의 치명적 결함:

```bash
# Line 144: 파일 내용 직접 수정!
sed -i "s/dockerfile: Dockerfile.*/dockerfile: $NEW_DOCKERFILE/" "$COMPOSE_FILE"
```

**문제점:**
1. ❌ docker-compose.yml 파일을 **직접 수정**
2. ❌ Git 추적 파일 변경 → Git conflict 발생
3. ❌ 다른 환경과 동기화 문제
4. ❌ 실수로 커밋 시 혼란

**결과:**
```bash
# switch-mode.sh 실행 후
git status
# modified: docker-compose.yml  ← Git이 추적하는 파일 변경!
```

---

### 문제 2: **컨테이너 이름 충돌 가능성** 🔥

#### 시나리오:

```bash
# 1. 개발 모드 실행 중 (docker-compose.yml 사용)
docker-compose up -d
# 컨테이너: naver-crawler-web

# 2. 프로덕션 모드로 전환
./scripts/switch-mode.sh
# docker-compose.yml 수정
# 같은 파일로 빌드/실행
# 컨테이너: naver-crawler-web (같은 이름!)
```

**문제점:**
1. ✅ 이름은 같아서 충돌 없음 (다행)
2. ⚠️ 하지만 이미지가 다름
   - 개발: naver-crawler-web:latest (Dockerfile.dev)
   - 프로덕션: naver-crawler-web:latest (Dockerfile)
   - **같은 태그에 다른 이미지!**

---

### 문제 3: **볼륨 마운트 충돌** 🔥

#### docker-compose.yml vs docker-compose.prod.yml:

**docker-compose.yml (개발 모드):**
```yaml
volumes:
  # 소스 코드 마운트 (Hot Reload)
  - ./app:/app/app
  - ./components:/app/components
  - ./lib:/app/lib
  # ... 더 많은 소스 코드
```

**docker-compose.prod.yml (프로덕션 모드):**
```yaml
volumes:
  # 데이터만 마운트
  - ./crawled_data:/app/crawled_data
  - ./logs:/app/logs
```

**전환 시 문제:**
```bash
# 개발 → 프로덕션 전환
docker-compose.yml 수정 (sed 명령어)
# ❌ 볼륨 설정은 그대로! (소스 코드 마운트 유지)
# ❌ 프로덕션 빌드 무의미 (소스 코드가 덮어씀)
```

---

### 문제 4: **환경 변수 불일치**

```bash
# docker-compose.yml
environment:
  - NODE_ENV=development  ← 개발 모드

# switch-mode.sh
# sed로 dockerfile만 변경
# ❌ NODE_ENV는 그대로!
```

**결과:**
- Dockerfile.prod로 빌드 (프로덕션 이미지)
- 하지만 NODE_ENV=development 실행
- 프로덕션 최적화 무효화!

---

### 문제 5: **데이터 손실 위험** ⚠️

```bash
# Line 121-123: 모든 컨테이너 중지
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.test.yml down
```

**위험:**
- `down` 명령어는 컨테이너 삭제
- 볼륨은 유지되지만...
- 실행 중인 크롤링 작업 강제 종료
- 데이터베이스 트랜잭션 손실 가능

---

### 문제 6: **.next 캐시 문제**

```bash
# 개발 모드 실행 중
# .next 디렉토리 생성 (개발 빌드)

# 프로덕션으로 전환
# docker-compose.yml 수정
# docker-compose build

# ❌ .next가 볼륨으로 마운트되어 있으면
#    빌드된 .next가 호스트 .next로 덮어씌워짐
```

---

## ✅ 올바른 모드 전환 방법

### 방법 1: 별도 Compose 파일 사용 (권장) ⭐

```bash
# 개발 모드
docker-compose -f docker-compose.yml up -d

# 프로덕션 모드로 전환
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**장점:**
- ✅ 파일 수정 없음
- ✅ Git conflict 없음
- ✅ 명확한 구분
- ✅ 안전함

---

### 방법 2: 심볼릭 링크 사용

```bash
# 개발 모드
ln -sf docker-compose.dev.yml docker-compose.yml
docker-compose up -d

# 프로덕션 모드
ln -sf docker-compose.prod.yml docker-compose.yml
docker-compose up -d
```

**문제:**
- ⚠️ 여전히 Git 추적 파일 변경

---

### 방법 3: 환경 변수 사용

```bash
# docker-compose.yml (단일 파일)
services:
  web:
    dockerfile: ${DOCKERFILE:-Dockerfile.dev}
    environment:
      - NODE_ENV=${NODE_ENV:-development}
```

```bash
# 개발 모드
docker-compose up -d

# 프로덕션 모드
DOCKERFILE=Dockerfile.prod NODE_ENV=production docker-compose up -d
```

**문제:**
- ⚠️ 볼륨 설정은 여전히 고정

---

## 🚀 최종 권장 방안

### deploy-to-nas.sh 방식 (현재 구현) ⭐⭐⭐

```bash
# 개발 모드 배포
./deploy-to-nas.sh dev
# → docker-compose -f docker-compose.yml restart web

# 프로덕션 모드 배포
./deploy-to-nas.sh prod
# → docker-compose -f docker-compose.prod.yml build
# → docker-compose -f docker-compose.prod.yml up -d
```

**장점:**
- ✅ 파일 수정 없음
- ✅ 명확한 compose 파일 지정
- ✅ 볼륨 설정 자동 적용
- ✅ 환경 변수 자동 설정
- ✅ Git conflict 없음
- ✅ 안전함

---

## ⚠️ 주의사항 및 체크리스트

### 개발 → 프로덕션 전환 시

**사전 체크:**
- [ ] 실행 중인 크롤링 작업 완료 확인
- [ ] 데이터베이스 백업
- [ ] 로그 백업
- [ ] 사용자에게 점검 공지 (10~15분 다운타임)

**실행:**
```bash
# 1. 개발 모드 중지
docker-compose -f docker-compose.yml down

# 2. 프로덕션 빌드 & 시작
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 또는 스크립트 사용
./deploy-to-nas.sh prod
```

**사후 검증:**
- [ ] 컨테이너 상태 확인
- [ ] NODE_ENV=production 확인
- [ ] 메모리 사용량 확인 (감소했는지)
- [ ] 웹 UI 접속 테스트
- [ ] 주요 기능 동작 확인

---

### 프로덕션 → 개발 전환 시

**사전 체크:**
- [ ] 빠른 버그 수정이 목적인지 확인
- [ ] 코드 변경 필요성 확인

**실행:**
```bash
# 1. 프로덕션 중지
docker-compose -f docker-compose.prod.yml down

# 2. 개발 모드 시작 (빌드 불필요)
docker-compose -f docker-compose.yml up -d

# 또는 스크립트 사용
./deploy-to-nas.sh dev
```

**사후 검증:**
- [ ] Hot Reload 작동 확인
- [ ] 코드 수정 → 자동 반영 테스트

---

## 🔥 기존 switch-mode.sh의 문제점 요약

### 심각한 문제:

1. **Git 추적 파일 직접 수정**
   ```bash
   sed -i "s/dockerfile: Dockerfile.*/dockerfile: $NEW_DOCKERFILE/" "$COMPOSE_FILE"
   # ❌ docker-compose.yml 변경
   # ❌ git status 오염
   ```

2. **볼륨 설정 불일치**
   ```bash
   # dockerfile만 변경
   # ❌ volumes 설정은 그대로
   # ❌ environment 설정은 그대로
   ```

3. **불완전한 전환**
   ```bash
   # Dockerfile.prod로 빌드
   # 하지만 NODE_ENV=development로 실행
   # ❌ 프로덕션 최적화 무효
   ```

4. **이미지 태그 충돌**
   ```bash
   # 같은 naver-crawler-web:latest 태그
   # 다른 Dockerfile로 빌드
   # ❌ 캐시 혼란
   ```

---

## ✅ 해결 방안

### 권장: deploy-to-nas.sh 사용

```bash
# 개발 모드
./deploy-to-nas.sh dev
# → docker-compose restart web (빠름, 안전)

# 프로덕션 모드
./deploy-to-nas.sh prod
# → docker-compose -f docker-compose.prod.yml build
# → docker-compose -f docker-compose.prod.yml up -d
```

### switch-mode.sh 폐기 또는 개선

**Option 1: 폐기** (권장)
- deploy-to-nas.sh로 대체
- 명확하고 안전함

**Option 2: 완전 재작성**
```bash
#!/bin/bash
# 새로운 switch-mode.sh

if [ "$CURRENT_MODE" = "dev" ]; then
    # 개발 → 프로덕션
    docker-compose -f docker-compose.yml down
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
else
    # 프로덕션 → 개발
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.yml up -d
fi
```

---

## 🎯 최종 결론

### 안전한 모드 전환 방법:

```bash
# ✅ 권장: deploy-to-nas.sh 사용
./deploy-to-nas.sh dev   # 개발 모드
./deploy-to-nas.sh prod  # 프로덕션 모드

# ❌ 비권장: switch-mode.sh 사용
# - Git 파일 수정
# - 불완전한 전환
# - 문제 발생 가능성 높음
```

### 시나리오 3 (버그 수정) 안전한 절차:

```bash
# 1. 프로덕션 → 개발 전환
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.yml up -d

# 2. 코드 수정
vi lib/some-file.ts

# 3. Hot Reload로 즉시 확인 (3~5초)
# http://<NAS_IP>:3000

# 4. 검증 완료 후 커밋
git add . && git commit -m "fix: bug fix" && git push

# 5. 개발 → 프로덕션 전환
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 또는 간단하게
./deploy-to-nas.sh dev   # 버그 수정
# 코드 수정...
./deploy-to-nas.sh prod  # 프로덕션 재배포
```

---

**Made with ❤️ for safe deployment**
