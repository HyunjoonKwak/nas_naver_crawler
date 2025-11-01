# 🚀 프로덕션 모드 사용 가이드 (v2.11.0+)

**작성일**: 2025-11-01
**버전**: v2.11.0+
**신규 추가**: Dockerfile.prod, docker-compose.prod.yml

---

## 📊 프로덕션 모드가 추가되었습니다!

v2.11.0부터 진짜 프로덕션 모드 배포가 가능합니다.

### 추가된 파일

```bash
🆕 Dockerfile.prod            → 프로덕션 최적화 빌드
🆕 docker-compose.prod.yml    → 프로덕션 구성
🔄 deploy-to-nas.sh           → prod 모드 지원
```

---

## ⚡ 빠른 시작

### 개발 모드 배포 (기본값, 권장)

```bash
./deploy-to-nas.sh dev
```

**소요 시간:** 3~5초 ⚡
**특징:** Hot Reload, 빠른 수정

---

### 프로덕션 모드 배포 (최적화)

```bash
./deploy-to-nas.sh prod
```

**소요 시간:** 10~15분 🕐
**특징:** Next.js 최적화, 메모리 절약

---

## 🔍 모드 비교

| 항목 | 개발 모드 | 프로덕션 모드 |
|------|-----------|---------------|
| **배포 시간** | 3~5초 ⚡ | 10~15분 🕐 |
| **Hot Reload** | ✅ ON | ❌ OFF |
| **메모리 사용** | ~500MB | ~300MB |
| **빌드 최적화** | ❌ 없음 | ✅ 압축, 캐싱 |
| **NODE_ENV** | development | production |
| **코드 변경** | 즉시 반영 | 재빌드 필요 |
| **적합 환경** | 개인 NAS | 공용 NAS |

---

## 📋 상세 가이드

### 프로덕션 배포 전체 과정

```bash
# 1. NAS SSH 접속
ssh admin@<NAS_IP>

# 2. 프로젝트 디렉토리 이동
cd /volume1/docker/naver-crawler

# 3. 최신 코드 받기
git pull origin main

# 4. 프로덕션 배포 실행 (10~15분)
./deploy-to-nas.sh prod

# 5. 배포 확인
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:3000/api/health
```

---

### 프로덕션 → 개발 모드 전환

```bash
# 프로덕션 중지
docker-compose -f docker-compose.prod.yml down

# 개발 모드 시작
./deploy-to-nas.sh dev
```

**데이터는 유지됩니다!** (볼륨 공유)

---

### 개발 → 프로덕션 모드 전환

```bash
# 개발 모드 중지
docker-compose down

# 프로덕션 배포
./deploy-to-nas.sh prod
```

---

## 🎯 언제 어떤 모드를 사용할까?

### 개발 모드 사용 ✅

- **개인 NAS** (1~2명 사용)
- 빠른 기능 추가/수정이 필요할 때
- Hot Reload로 편리한 개발 원할 때
- 성능보다 편의성 우선

**명령어:**
```bash
./deploy-to-nas.sh dev
```

---

### 프로덕션 모드 사용 ✅

- **공용 NAS** (3명 이상 사용)
- 안정적인 운영이 필요할 때
- 메모리 최적화가 필요할 때
- 여러 사용자 동시 접속

**명령어:**
```bash
./deploy-to-nas.sh prod
```

---

## 🔧 프로덕션 모드 확인 방법

### 1. NODE_ENV 확인

```bash
docker-compose -f docker-compose.prod.yml exec web env | grep NODE_ENV
```

**예상 출력:**
```
NODE_ENV=production
```

---

### 2. 실행 명령어 확인

```bash
docker-compose -f docker-compose.prod.yml exec web ps aux | grep node
```

**개발 모드:**
```
npm run dev  ← Hot Reload
```

**프로덕션 모드:**
```
npm start    ← 최적화됨
```

---

### 3. 빌드 파일 확인

```bash
docker-compose -f docker-compose.prod.yml exec web ls -la /app/.next
```

**.next 디렉토리가 있어야 프로덕션 빌드 완료**

---

### 4. 메모리 사용량 확인

```bash
docker stats --no-stream naver-crawler-web
```

**프로덕션이 개발보다 100~200MB 적게 사용**

---

## 💡 팁 & 주의사항

### Tip 1: 혼합 사용 전략

```bash
# 평소: 개발 모드 (빠른 수정)
./deploy-to-nas.sh dev

# 중요 업데이트 후: 프로덕션 배포
./deploy-to-nas.sh prod

# 버그 발견: 개발 모드로 전환
docker-compose -f docker-compose.prod.yml down
./deploy-to-nas.sh dev
# 수정 후 다시 프로덕션
./deploy-to-nas.sh prod
```

---

### Tip 2: 빌드 시간 단축

```bash
# 캐시 사용 (--no-cache 제거)
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

### 주의사항 1: 디스크 공간

프로덕션 빌드는 **추가 2~3GB** 필요합니다.

```bash
# 디스크 공간 확인
df -h

# 부족하면 Docker 정리
docker system prune -a
```

---

### 주의사항 2: 다운타임

프로덕션 배포 시 **10~15분 다운타임** 발생합니다.

**해결:**
- 사용자 적은 시간대 배포
- 점검 공지
- Blue-Green 배포 (고급)

---

### 주의사항 3: 환경 변수

config.env 파일은 **두 모드 공유**합니다.

변경 후 재시작 필요:
```bash
# 개발 모드
docker-compose restart web

# 프로덕션 모드
docker-compose -f docker-compose.prod.yml restart web
```

---

## 📚 관련 문서

1. **[PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)** - 프로덕션 배포 상세 가이드
2. **[NAS_DEPLOYMENT_GUIDE.md](docs/NAS_DEPLOYMENT_GUIDE.md)** - 전체 배포 가이드
3. **[DEPLOYMENT_ANALYSIS.md](DEPLOYMENT_ANALYSIS.md)** - 배포 분석 보고서

---

## 🎉 요약

### v2.11.0+ 배포 옵션

```bash
# Option 1: 개발 모드 (기본값, 권장)
./deploy-to-nas.sh dev
# → 3~5초, Hot Reload, 편리함

# Option 2: 프로덕션 모드 (최적화)
./deploy-to-nas.sh prod
# → 10~15분, 메모리 절약, 안정적
```

**선택 기준:**
- **개인 NAS** → 개발 모드
- **공용 NAS** → 프로덕션 모드
- **혼합 사용** → 평소 개발, 중요 업데이트 시 프로덕션

**Made with ❤️ for NAS users**
