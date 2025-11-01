# 📜 Scripts 폴더

이 폴더에는 프로젝트 유지보수, 배포, 마이그레이션 등에 사용되는 유틸리티 스크립트가 포함되어 있습니다.

---

## 🚀 배포 & 운영 스크립트

### **switch-mode-safe.sh** (모드 전환)
개발 모드 ↔ 프로덕션 모드 안전하게 전환합니다.

**사용법**:
```bash
./scripts/switch-mode-safe.sh
```

**기능**:
- 현재 모드 자동 감지
- 대화형 프롬프트 (사용자 확인)
- Git 파일 수정 없음 (별도 compose 파일 사용)
- 자동 검증 5단계 (컨테이너/NODE_ENV/DB/Redis)

**관련 문서**: [MODE_SWITCHING_ANALYSIS.md](../MODE_SWITCHING_ANALYSIS.md)

---

### **cleanup-docker.sh** (Docker 정리)
불필요한 Docker 리소스를 정리합니다.

**사용법**:
```bash
./scripts/cleanup-docker.sh
```

**기능**:
- 중지된 컨테이너 확인 및 삭제
- 사용하지 않는 이미지 정리
- 사용하지 않는 볼륨 정리
- 디스크 공간 회복

**언제 사용**:
- 디스크 공간 부족 시
- Docker 빌드 실패 시 (ENOSPC 에러)
- 정기 유지보수

---

### **fix-nas-docker-compose.sh** (NAS Docker 문제 해결)
NAS 환경에서 Docker Compose 관련 문제를 진단하고 해결합니다.

**사용법**:
```bash
./scripts/fix-nas-docker-compose.sh
```

**기능**:
- Docker Compose 버전 확인
- TMPDIR 에러 진단
- Docker Compose V2 전환 가이드
- 환경 변수 설정

**언제 사용**:
- NAS 초기 설정 시
- Docker Compose 에러 발생 시
- TMPDIR 관련 에러 시

**관련 문서**: [NAS_DEPLOYMENT_GUIDE.md](../docs/NAS_DEPLOYMENT_GUIDE.md)

---

### **verify-perf-improve.sh** (성능 검증)
크롤러 성능 개선 검증 스크립트입니다.

**사용법**:
```bash
./scripts/verify-perf-improve.sh
```

**기능**:
- 크롤링 속도 측정 (articles/sec)
- 5개 단지 크롤링 소요 시간 측정
- 성능 개선 전후 비교
- 결과 리포트 생성

**언제 사용**:
- 크롤러 성능 최적화 후 검증
- 벤치마크 측정

**관련 문서**: [PERFORMANCE.md](../docs/PERFORMANCE.md)

---

## 🗃️ 데이터베이스 관련 스크립트

### **test-db.ts** (DB 연결 테스트)
데이터베이스 연결 및 CRUD 작동 여부를 테스트합니다.

**사용법**:
```bash
npx ts-node scripts/test-db.ts
```

**기능**:
- DB 연결 테스트
- 테이블 카운트 조회
- CRUD 작동 테스트 (Create/Read/Delete)
- Prisma 클라이언트 정상 작동 확인

**언제 사용**:
- DB 연결 문제 진단
- Prisma 설정 검증
- 초기 설정 후 테스트

---

### **fix-created-at.sql** (createdAt 수정)
Article 테이블의 createdAt 필드를 수정하는 SQL 스크립트입니다.

**사용법**:
```bash
# Docker 컨테이너 내부에서 실행
docker exec -i naver-crawler-db psql -U crawler_user -d naver_crawler < scripts/fix-created-at.sql
```

**내용**:
```sql
-- createdAt 필드 타임존 문제 수정
UPDATE articles SET created_at = NOW() WHERE created_at IS NULL;
```

**언제 사용**:
- createdAt 데이터 이상 발견 시
- 타임존 문제 수정 시
- 일회성 마이그레이션

---

## 🔄 마이그레이션 스크립트

### **migrate-existing-prices.ts** (가격 데이터 마이그레이션)
기존 문자열 가격 데이터를 BigInt 숫자 컬럼으로 마이그레이션합니다.

**사용법**:
```bash
npx ts-node scripts/migrate-existing-prices.ts
```

**기능**:
- 문자열 가격 → BigInt 숫자 변환
- "7억6,000" → 760000000n
- 배치 처리 (100개씩)
- 진행 상황 표시
- 에러 로깅

**언제 사용**:
- 스키마 변경 후 데이터 마이그레이션
- 가격 정렬/필터 성능 개선 적용 시
- 일회성 실행 (이미 마이그레이션 완료)

**관련 PR**: v2.11.0 - 숫자 가격 컬럼 추가

---

### **geocode-existing-complexes.ts** (지오코딩 마이그레이션)
기존 단지 데이터에 지오코딩 정보를 추가합니다.

**사용법**:
```bash
npx ts-node scripts/geocode-existing-complexes.ts
```

**기능**:
- 주소 → 위도/경도 변환 (Kakao API)
- 법정동코드 추출
- 배치 처리 (API 제한 고려)
- 진행 상황 표시

**언제 사용**:
- 지오코딩 기능 추가 후 기존 데이터 업데이트
- 주소 기반 검색 기능 활성화
- 일회성 실행 (이미 마이그레이션 완료)

**관련 PR**: 지오코딩 기능 추가

---

## 📂 파일 정리 내역

### **제거된 파일** (v2.12.0)
- ❌ `dev_mode.sh` - deploy-to-nas.sh로 대체
- ❌ `test-db.mjs` - test-db.ts와 중복
- ❌ `migrate-price-data.ts` - migrate-existing-prices.ts로 통합

### **유지된 파일**
- ✅ 모든 현재 사용 중인 스크립트
- ✅ 문제 해결용 유틸리티 스크립트
- ✅ 일회성이지만 참고 가치 있는 마이그레이션 스크립트

---

## 📋 스크립트 카테고리 정리

| 카테고리 | 스크립트 | 빈도 |
|---------|---------|------|
| **배포/운영** | switch-mode-safe.sh | 자주 |
| **유지보수** | cleanup-docker.sh, fix-nas-docker-compose.sh | 가끔 |
| **테스트** | test-db.ts, verify-perf-improve.sh | 가끔 |
| **마이그레이션** | migrate-existing-prices.ts, geocode-existing-complexes.ts | 일회성 |
| **참고용** | fix-created-at.sql | 일회성 |

---

## 💡 스크립트 사용 팁

### **1. 권한 문제 발생 시**
```bash
chmod +x scripts/*.sh
```

### **2. TypeScript 스크립트 실행**
```bash
# ts-node 설치 필요
npm install -g ts-node

# 실행
npx ts-node scripts/스크립트.ts
```

### **3. Docker 컨테이너 내부에서 SQL 실행**
```bash
# 파일로 실행
docker exec -i naver-crawler-db psql -U crawler_user -d naver_crawler < scripts/파일.sql

# 직접 명령
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler
```

---

## 🚀 새 스크립트 추가 시

1. **명확한 목적** - 파일명에 용도가 드러나야 함
2. **사용법 주석** - 파일 상단에 사용법 명시
3. **에러 핸들링** - `set -e` 또는 try-catch 사용
4. **진행 상황 표시** - 사용자 피드백 제공
5. **README 업데이트** - 이 파일에 설명 추가

---

**Made with ❤️ for NAS users**
