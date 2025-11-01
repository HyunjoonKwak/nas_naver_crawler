# 🔍 배포 스크립트 분석 보고서

**작성일**: 2025-11-01
**버전**: v2.11.0
**분석 대상**: deploy-to-nas.sh

---

## 📊 현재 환경 분석

### 운영 중인 환경
- **커밋**: ea8b1f2 (v2.11.0 이전)
- **Docker Compose**: docker-compose.yml
- **컨테이너**: naver-crawler-web (개발 모드)
- **상태**: 정상 운영 중

### Docker 파일 구성 현황

```bash
✅ docker-compose.yml           → 개발 모드 (Dockerfile.dev 사용)
✅ docker-compose.dev.yml       → 개발 모드 (Dockerfile.dev 사용) - 동일 내용
✅ Dockerfile                   → 개발 모드 (CMD npm run dev)
✅ Dockerfile.dev               → 개발 모드 (CMD npm run dev) - 동일 내용
❌ Dockerfile.prod              → 존재하지 않음
❌ docker-compose.prod.yml      → 존재하지 않음
```

**주요 발견:**
- docker-compose.yml과 docker-compose.dev.yml이 **완전히 동일**
- Dockerfile과 Dockerfile.dev가 **완전히 동일**
- **프로덕션 전용 파일이 존재하지 않음**
- 모든 설정이 개발 모드(Hot Reload)로 구성됨

---

## ⚠️ deploy-to-nas.sh 분석

### 개발 모드 배포 (`./deploy-to-nas.sh dev`)

**원래 코드:**
```bash
docker-compose -f docker-compose.dev.yml restart web
```

**문제점:**
1. 현재 운영 중인 컨테이너는 `docker-compose.yml`로 실행 중
2. `docker-compose -f docker-compose.dev.yml`은 **다른 프로젝트로 인식**
3. 컨테이너를 찾지 못할 가능성 있음

**수정 후:**
```bash
docker-compose restart web
```

**안전성:** ✅ **안전**
- 현재 실행 중인 docker-compose.yml 사용
- 같은 컨테이너 재시작
- 데이터 손실 없음
- 빠른 배포 (3~5초)

---

### 프로덕션 모드 배포 (`./deploy-to-nas.sh prod`)

**원래 코드:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**문제점:**
1. Dockerfile.prod가 없어서 **개발 모드로 빌드됨**
2. `CMD ["npm", "run", "dev"]` 실행 (프로덕션 아님)
3. Hot Reload 활성화 (불필요한 리소스)
4. NODE_ENV=development (보안 취약)
5. Next.js 빌드 최적화 없음

**수정 후:**
```bash
log_warn "⚠️  현재 프로덕션 전용 Dockerfile이 없습니다"
log_warn "⚠️  개발 모드로 빌드합니다 (Hot Reload 포함)"
docker-compose down
docker-compose build --no-cache
docker-compose up -d
log_warn "참고: 프로덕션 최적화를 원하면 Dockerfile.prod를 생성하세요"
```

**안전성:** ⚠️ **안전하지만 최적화 안 됨**
- 동작은 정상 (에러 없음)
- 하지만 개발 모드로 실행
- 프로덕션 최적화 없음
- 10~15분 빌드 시간 소요 (개발 모드인데...)

---

## ✅ 권장 배포 방법

### 방법 1: 개발 모드 빠른 배포 (권장) ⭐

```bash
# NAS SSH 접속
cd /volume1/docker/naver-crawler
git pull origin main

# 방법 A: 배포 스크립트 사용
./deploy-to-nas.sh dev

# 방법 B: 수동 재시작
docker-compose restart web
```

**장점:**
- ✅ 안전함 (데이터 손실 없음)
- ✅ 빠름 (3~5초)
- ✅ 현재 운영 환경과 일치
- ✅ Hot Reload로 빠른 개발 가능

**단점:**
- ⚠️ 프로덕션 최적화 없음
- ⚠️ 메모리 사용량 약간 높음

**적합한 경우:**
- 빠른 버그 수정
- 기능 추가
- 일상적인 업데이트

---

### 방법 2: 완전 재빌드 (문제 발생 시)

```bash
cd /volume1/docker/naver-crawler
git pull origin main

# 방법 A: 배포 스크립트 사용
./deploy-to-nas.sh prod

# 방법 B: 수동 재빌드
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**장점:**
- ✅ 깨끗한 재시작
- ✅ 모든 의존성 재설치
- ✅ 캐시 문제 해결

**단점:**
- ⚠️ 시간 소요 (10~15분)
- ⚠️ 다운타임 발생
- ⚠️ 여전히 개발 모드로 실행

**적합한 경우:**
- Docker 이미지 문제
- 의존성 변경
- 캐시 문제
- 알 수 없는 오류

---

## 🎯 결론 및 권장사항

### 1. 현재 상황에서 안전한 배포 방법

```bash
# ✅ 권장: 개발 모드 빠른 배포
./deploy-to-nas.sh dev

# 또는
docker-compose restart web
```

**이유:**
- 현재 운영 환경과 100% 일치
- 데이터 손실 위험 없음
- 빠른 배포 (3~5초)
- v2.11.0의 모든 개선사항 적용됨
  - Redis SCAN 최적화
  - 가격 파싱 수정
  - 74개 테스트 통과

### 2. 프로덕션 모드 사용 금지 (현재)

```bash
# ❌ 사용하지 마세요 (현재는 의미 없음)
./deploy-to-nas.sh prod
```

**이유:**
- Dockerfile.prod가 없어서 개발 모드로 빌드됨
- 10분 걸려서 개발 모드 만드는 건 비효율적
- 프로덕션 최적화 효과 전혀 없음

### 3. 향후 개선 방안 (선택사항)

진짜 프로덕션 최적화를 원한다면:

1. **Dockerfile.prod 생성 필요**
   ```dockerfile
   # 프로덕션 빌드
   RUN npm run build
   CMD ["npm", "start"]
   ENV NODE_ENV=production
   ```

2. **docker-compose.prod.yml 생성**
   ```yaml
   services:
     web:
       dockerfile: Dockerfile.prod
       environment:
         - NODE_ENV=production
       # Hot Reload 볼륨 마운트 제거
   ```

3. **배포 스크립트 수정**
   ```bash
   if [ "$ENVIRONMENT" = "prod" ]; then
     docker-compose -f docker-compose.prod.yml up -d
   fi
   ```

**하지만 현재는 필요 없음:**
- NAS 개인 용도로 개발 모드로 충분
- Hot Reload는 편리한 기능
- 성능 차이 미미 (개인 사용)

---

## 📋 Q&A

### Q1: 지금 당장 배포해도 되나요?

**A:** ✅ 네, 안전합니다!

```bash
./deploy-to-nas.sh dev
```

또는

```bash
docker-compose restart web
```

### Q2: prod로 배포하면 개발 모드 흔적이 지워지나요?

**A:** ❌ 아니요, 오해입니다.

- `prod`로 배포해도 **개발 모드로 실행**됩니다
- Dockerfile.prod가 없기 때문
- 단지 전체 재빌드만 수행 (10분 소요)
- 결과는 개발 모드와 동일

### Q3: 개발 모드로 운영해도 문제없나요?

**A:** ✅ 네, NAS 개인 용도는 괜찮습니다.

**개발 모드 장점:**
- Hot Reload로 빠른 수정 가능
- 디버깅 편리
- 소스맵 제공

**개발 모드 단점:**
- 메모리 약간 더 사용 (100~200MB 차이)
- 빌드 최적화 없음 (하지만 체감 차이 거의 없음)

**결론:** 개인 NAS 용도로는 개발 모드도 충분히 안정적

### Q4: 데이터 손실 위험은 없나요?

**A:** ✅ 없습니다!

**데이터 저장 위치:**
- PostgreSQL: `postgres_data` 볼륨 (영구 저장)
- Redis: `redis_data` 볼륨 (영구 저장)
- 크롤링 데이터: `./crawled_data` (호스트 폴더)
- 로그: `./logs` (호스트 폴더)

**컨테이너 재시작/재빌드 시:**
- 볼륨 데이터 유지됨
- 데이터 손실 없음
- 단, `docker-compose down -v`는 절대 사용 금지! (볼륨 삭제)

---

## 🚀 최종 배포 가이드

### 단계별 배포 절차

```bash
# 1. NAS SSH 접속
ssh admin@<NAS_IP>

# 2. 프로젝트 디렉토리 이동
cd /volume1/docker/naver-crawler

# 3. 현재 상태 백업 (선택)
docker-compose logs --tail=100 web > deploy-backup-$(date +%Y%m%d).log

# 4. 최신 코드 가져오기
git pull origin main

# 5. 배포 실행 (3~5초 소요)
./deploy-to-nas.sh dev

# 6. 배포 확인
docker-compose ps
docker-compose logs -f web  # Ctrl+C로 종료

# 7. 웹 브라우저 접속
# http://<NAS_IP>:3000
```

### 배포 후 확인 사항

- [ ] 컨테이너 상태: `Up` 확인
- [ ] 헬스 체크: `curl http://localhost:3000/api/health`
- [ ] 웹 UI 접속: 정상 로딩 확인
- [ ] 로그 확인: 에러 없는지 확인

---

**최종 권고:**

✅ **`./deploy-to-nas.sh dev` 사용을 권장합니다**

- 안전함
- 빠름 (3~5초)
- v2.11.0의 모든 개선사항 적용
- 데이터 손실 없음
- 운영 중인 환경과 일치

**Made with ❤️ for NAS users**
