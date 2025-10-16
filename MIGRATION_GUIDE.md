# 사용자 데이터 분리 마이그레이션 가이드

## 개요
이 마이그레이션은 사용자별로 데이터를 분리하는 기능을 추가합니다.

### 사용자 등급 시스템
- **ADMIN**: 첫 번째 사용자, 모든 데이터 접근 가능
- **FAMILY**: 패밀리 등급, ADMIN/FAMILY 사용자들끼리 데이터 공유
- **GUEST**: 게스트 등급, 본인 데이터만 접근 가능 (완전 격리)

## NAS 배포 절차

### 1. 코드 업데이트
```bash
cd /volume1/code_work/nas_naver_crawler
git pull origin main
```

### 2. 데이터베이스 백업 (중요!)
```bash
# PostgreSQL 백업
docker exec -t naver-crawler-db pg_dump -U crawler naver_crawler > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. 데이터베이스 마이그레이션 실행
```bash
# Docker 컨테이너 내부로 진입
docker exec -it naver-crawler-web sh

# 마이그레이션 실행
npx prisma migrate deploy

# Prisma Client 재생성
npx prisma generate

# 컨테이너에서 나가기
exit
```

### 4. Docker 재빌드 및 재시작
```bash
# 컨테이너 중지
docker-compose down

# 이미지 재빌드
docker-compose build --no-cache

# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f naver-crawler-web
```

## 마이그레이션 내용

### 변경된 테이블
1. **users**: role 기본값이 'GUEST'로 변경
2. **complexes**: userId 추가 (크롤링 실행한 사용자)
3. **crawl_history**: userId 추가
4. **favorites**: userId 추가, unique 제약조건 변경
5. **alerts**: userId 추가
6. **schedules**: userId 추가
7. **groups**: userId 추가
8. **useful_links**: userId 추가

### 기존 데이터 처리
- 모든 기존 데이터는 첫 번째 ADMIN 사용자에게 할당됩니다.
- 사용자가 없는 경우 임시 UUID가 할당됩니다 (나중에 수정 필요).

## 사용 방법

### 회원가입
1. 첫 번째 사용자: 자동으로 ADMIN 권한 부여
2. 이후 사용자: GUEST로 가입, 관리자 승인 필요

### 사용자 관리 (ADMIN만 가능)
1. 시스템 페이지 → 사용자 관리 탭
2. 사용자 승인/거부
3. 등급 변경:
   - **게스트 (격리)**: 본인 데이터만
   - **패밀리 (공유)**: 가족 데이터 공유
   - **관리자**: 모든 권한

### 데이터 공유 규칙
- **ADMIN**: 모든 사용자의 데이터 볼 수 있음
- **FAMILY**: ADMIN과 FAMILY 사용자들의 데이터 공유
- **GUEST**: 본인이 크롤링한 데이터만 볼 수 있음

## 주의사항

### 🚨 중요
- 마이그레이션 전에 **반드시 데이터베이스 백업**을 수행하세요.
- Docker 재빌드 중에는 서비스가 중단됩니다.

### 백업 명령어
```bash
# PostgreSQL 백업
docker exec -t naver-crawler-db pg_dump -U crawler naver_crawler > backup_$(date +%Y%m%d_%H%M%S).sql

# 복원 (필요시)
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i naver-crawler-db psql -U crawler naver_crawler
```

## 완료된 작업

### ✅ 적용된 API
모든 주요 API에 사용자 인증 및 데이터 필터링이 적용되었습니다:
- ✅ `/api/complexes/*` - 단지 조회 API
- ✅ `/api/crawl` - 크롤링 API
- ✅ `/api/alerts/*` - 알림 관련 API
- ✅ `/api/complexes/favorite` - 즐겨찾기 토글 API
- ✅ `/api/schedules/*` - 스케줄 API
- ✅ `/api/groups/*` - 그룹 API
- ✅ `/api/useful-links` - 유용한 링크 API
- ✅ `/api/auth/*` - 인증 API
- ✅ `/api/users` - 사용자 관리 API

### 빌드 상태
- ✅ TypeScript 타입 에러 없음
- ✅ 빌드 성공
- ⚠️ 로컬 DB 연결 에러 (NAS에서는 정상 작동 예상)

## 다음 단계

1. NAS에 배포
2. DB 마이그레이션 실행
3. 첫 사용자로 회원가입 (자동 ADMIN)
4. 추가 사용자 승인 및 등급 부여
5. 실제 환경에서 테스트

## 문제 해결

### 마이그레이션 실패 시
```bash
# 마이그레이션 상태 확인
docker exec naver-crawler-web npx prisma migrate status

# 마이그레이션 초기화 (주의: 데이터 손실 가능)
docker exec naver-crawler-web npx prisma migrate reset
```

### 빌드 에러 시
```bash
# Prisma Client 재생성
docker exec naver-crawler-web npx prisma generate

# Node modules 재설치
docker exec naver-crawler-web npm install
```
