# 🛠️ 개발/테스트 환경 설정 가이드

**목적**: 프로덕션 서비스 중단 없이 성능 개선 작업 테스트

---

## 📋 환경 분리 전략

### 프로덕션 환경 (유지)
```
브랜치: main
포트: 3000
DB 포트: 5434
컨테이너: naver-crawler-web, naver-crawler-db
실행: docker-compose.yml
```

### 개발/테스트 환경 (신규)
```
브랜치: perf_improve
포트: 3001
DB 포트: 5435
컨테이너: naver-crawler-web-test, naver-crawler-db-test
실행: docker-compose.test.yml
```

---

## 🚀 설정 방법

### Step 1: 테스트용 디렉토리 생성

```bash
# 프로덕션 서비스가 실행 중인 디렉토리
cd /volume1/docker/naver-crawler

# 테스트용 데이터 디렉토리 생성
mkdir -p crawled_data_test
mkdir -p logs_test
```

### Step 2: perf_improve 브랜치로 전환

```bash
# 현재 변경사항 확인
git status

# perf_improve 브랜치로 전환
git checkout perf_improve

# 최신 코드 받기
git pull origin perf_improve
```

### Step 3: 테스트 환경 실행

```bash
# 테스트 환경 시작 (프로덕션은 그대로 유지)
docker-compose -f docker-compose.test.yml up -d

# 상태 확인
docker-compose -f docker-compose.test.yml ps
```

**결과**:
```
NAME                        STATUS    PORTS
naver-crawler-web           Up        0.0.0.0:3000->3000/tcp  # 프로덕션 (유지)
naver-crawler-db            Up        0.0.0.0:5434->5432/tcp
naver-crawler-web-test      Up        0.0.0.0:3001->3000/tcp  # 테스트 (신규)
naver-crawler-db-test       Up        0.0.0.0:5435->5432/tcp
```

### Step 4: 데이터베이스 마이그레이션

```bash
# 테스트 DB 컨테이너에 접속
docker exec -it naver-crawler-web-test sh

# Prisma 마이그레이션
npx prisma migrate deploy

# Prisma Client 생성
npx prisma generate

# 테스트 데이터 준비 (프로덕션 DB에서 복사 - 선택사항)
# pg_dump로 백업 후 복원

# 컨테이너에서 나가기
exit
```

### Step 5: 기존 데이터 마이그레이션 (숫자 가격 컬럼)

```bash
# 테스트 컨테이너 내부
docker exec -it naver-crawler-web-test sh

# 마이그레이션 스크립트 실행
npx ts-node scripts/migrate-existing-prices.ts

# 결과:
# 🔄 Starting price migration...
# 📊 Found 1234 articles to migrate
# ⏳ Progress: 1000/1234 (81.0%) - Batch time: 2.34s
# ⏳ Progress: 1234/1234 (100.0%) - Batch time: 0.56s
# ✅ Migration completed!
# 📈 Results:
#    - Total processed: 1234
#    - Success: 1234
#    - Errors: 0

exit
```

### Step 6: 테스트 환경 접속

```
프로덕션: http://NAS_IP:3000  (main 브랜치 - 기존 사용자용)
테스트:   http://NAS_IP:3001  (perf_improve 브랜치 - 개발용)
```

---

## 🔍 성능 비교 테스트

### 1. 프로덕션 (3000 포트)

```bash
# API 응답 시간 측정
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/api/complexes

# 예상 결과: Time: 2.5s
```

### 2. 테스트 (3001 포트)

```bash
# 개선된 API 응답 시간 측정
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:3001/api/complexes

# 예상 결과: Time: 0.2s (90% 개선!)
```

### 3. 메모리 사용량 비교

```bash
docker stats

# 예상 결과:
# naver-crawler-web:      MEM: 1.5GB / 2GB  (75%)
# naver-crawler-web-test: MEM: 800MB / 2GB  (40%)
```

---

## 📊 테스트 체크리스트

### 기능 테스트
- [ ] 단지 목록 조회 (가격 통계 정상 표시)
- [ ] 단지 상세 조회
- [ ] 크롤링 실행 (숫자 컬럼 저장 확인)
- [ ] 필터링 (가격, 거래유형)
- [ ] 정렬 (이름, 지역, 날짜)

### 성능 테스트
- [ ] API 응답 시간 (목표: 100-300ms)
- [ ] 메모리 사용량 (목표: 1GB 이하)
- [ ] DB 쿼리 수 (목표: 5개 이하)
- [ ] 동시 요청 처리 (목표: 100+ req/s)

### 데이터 검증
- [ ] 가격 통계 정확성
- [ ] 24시간 매물 변동 수치
- [ ] 거래 유형별 통계
- [ ] 최근 수집일 표시

---

## 🔄 워크플로우

### 일반적인 개발 흐름

```bash
# 1. 프로덕션 서비스 유지 (3000 포트)
docker-compose up -d

# 2. 개발 환경 시작 (3001 포트)
git checkout perf_improve
docker-compose -f docker-compose.test.yml up -d

# 3. 코드 수정
# (Hot Reload로 자동 반영)

# 4. 테스트
curl http://localhost:3001/api/complexes

# 5. 만족스러우면 커밋
git add .
git commit -m "feat: Task X 완료"
git push origin perf_improve

# 6. 개발 환경 종료 (선택)
docker-compose -f docker-compose.test.yml down
```

### 완료 후 프로덕션 배포

```bash
# 1. main 브랜치로 전환
git checkout main

# 2. perf_improve 브랜치 병합
git merge perf_improve

# 3. 프로덕션 재배포
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. 기존 데이터 마이그레이션
docker exec -it naver-crawler-web sh
npx ts-node scripts/migrate-existing-prices.ts
exit
```

---

## 💾 데이터 관리

### 테스트 DB 초기화

```bash
# 테스트 DB만 초기화 (프로덕션 영향 없음)
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

### 프로덕션 데이터 복사 (선택사항)

```bash
# 1. 프로덕션 DB 백업
docker exec -t naver-crawler-db pg_dump -U crawler_user naver_crawler > prod_backup.sql

# 2. 테스트 DB로 복원
docker exec -i naver-crawler-db-test psql -U crawler_user naver_crawler_test < prod_backup.sql

# 3. 마이그레이션 스크립트 실행
docker exec -it naver-crawler-web-test npx ts-node scripts/migrate-existing-prices.ts
```

---

## 🎛️ 관리 스크립트

### scripts/manage-test.sh (생성 권장)

```bash
#!/bin/bash

echo "=== 테스트 환경 관리 ==="
echo "1) 🚀 테스트 환경 시작"
echo "2) 🛑 테스트 환경 종료"
echo "3) 🔄 테스트 환경 재시작"
echo "4) 📊 상태 확인"
echo "5) 📝 로그 확인"
echo "6) 🗑️  테스트 환경 완전 삭제 (DB 포함)"
echo "7) ⬅️  main 브랜치로 복귀"

read -p "선택: " choice

case $choice in
  1)
    git checkout perf_improve
    docker-compose -f docker-compose.test.yml up -d
    docker-compose -f docker-compose.test.yml logs -f web-test
    ;;
  2)
    docker-compose -f docker-compose.test.yml down
    ;;
  3)
    docker-compose -f docker-compose.test.yml restart
    ;;
  4)
    docker-compose -f docker-compose.test.yml ps
    docker stats --no-stream naver-crawler-web-test naver-crawler-db-test
    ;;
  5)
    docker-compose -f docker-compose.test.yml logs -f web-test
    ;;
  6)
    read -p "정말 삭제하시겠습니까? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      docker-compose -f docker-compose.test.yml down -v
      rm -rf crawled_data_test logs_test
      echo "✅ 테스트 환경 삭제 완료"
    fi
    ;;
  7)
    docker-compose -f docker-compose.test.yml down
    git checkout main
    echo "✅ main 브랜치로 복귀"
    ;;
esac
```

---

## 📝 .gitignore 업데이트

```bash
# .gitignore에 추가
crawled_data_test/
logs_test/
```

---

## 🎯 장점

### 1. 안전성 ✅
- 프로덕션 서비스 중단 없음
- 별도 DB로 데이터 손상 위험 없음
- 언제든 롤백 가능

### 2. 편의성 ✅
- Hot Reload로 빠른 개발
- 실시간 테스트 가능
- 프로덕션과 동시 비교 가능

### 3. 효율성 ✅
- 포트만 다르게 설정
- 같은 코드베이스 사용
- 리소스 독립적 관리

---

## ⚠️ 주의사항

### 리소스 사용량
```
프로덕션: 2GB (web) + 1GB (db) = 3GB
테스트:   2GB (web-test) + 1GB (db-test) = 3GB
총합:     6GB

NAS 메모리가 8GB 이상이면 동시 실행 가능
```

### 포트 충돌 확인
```bash
# 3001, 5435 포트가 사용 가능한지 확인
netstat -tuln | grep -E '3001|5435'
```

---

## 🚀 빠른 시작

```bash
# 1. 테스트 환경 파일 적용
git add docker-compose.test.yml DEV_ENVIRONMENT_SETUP.md
git commit -m "feat: 테스트 환경 설정 추가 (포트 3001)"
git push origin perf_improve

# 2. 디렉토리 생성
mkdir -p crawled_data_test logs_test

# 3. 테스트 환경 시작
docker-compose -f docker-compose.test.yml up -d

# 4. 브라우저 접속
# 프로덕션: http://localhost:3000 (기존)
# 테스트:   http://localhost:3001 (성능 개선 버전)

# 5. 성능 비교!
```

---

이제 안전하게 작업할 수 있습니다! 계속 진행하시겠습니까? 😊

