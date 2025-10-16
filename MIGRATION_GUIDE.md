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
cd /volume1/docker/property_manager
git pull origin main
```

### 2. 데이터베이스 마이그레이션 실행
```bash
# Docker 컨테이너 내부로 진입
docker exec -it property_manager sh

# 마이그레이션 실행
npx prisma migrate deploy

# Prisma Client 재생성
npx prisma generate

# 컨테이너에서 나가기
exit
```

### 3. Docker 재빌드 및 재시작
```bash
# 컨테이너 중지
docker-compose down

# 이미지 재빌드
docker-compose build --no-cache

# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
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
docker exec -t property_manager_db pg_dump -U crawler naver_crawler > backup_$(date +%Y%m%d_%H%M%S).sql

# 복원 (필요시)
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i property_manager_db psql -U crawler naver_crawler
```

## 알려진 이슈

### 미완성 API
다음 API들은 아직 userId 필터링이 적용되지 않았습니다:
- `/api/alerts/*` - 알림 관련 API
- `/api/favorites/*` - 즐겨찾기 API
- `/api/schedules/*` - 스케줄 API
- `/api/groups/*` - 그룹 API
- `/api/links/*` - 유용한 링크 API

이 API들은 현재 빌드 에러가 발생하므로, 추가 수정이 필요합니다.

## 다음 단계

1. 나머지 API에 인증 및 필터링 로직 추가
2. 각 페이지에서 데이터 조회 시 사용자 필터링 확인
3. 에러 처리 및 권한 체크 강화

## 문제 해결

### 마이그레이션 실패 시
```bash
# 마이그레이션 상태 확인
docker exec property_manager npx prisma migrate status

# 마이그레이션 초기화 (주의: 데이터 손실 가능)
docker exec property_manager npx prisma migrate reset
```

### 빌드 에러 시
```bash
# Prisma Client 재생성
docker exec property_manager npx prisma generate

# Node modules 재설치
docker exec property_manager npm install
```
