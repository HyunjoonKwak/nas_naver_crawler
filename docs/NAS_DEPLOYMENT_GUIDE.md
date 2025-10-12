# NAS 배포 가이드 - PostgreSQL 추가

## 배포 전 준비사항

### 1. 백업
```bash
# 현재 크롤링 데이터 백업 (혹시 모를 상황 대비)
cp -r crawled_data/ crawled_data_backup/
```

### 2. 파일 동기화
NAS에 다음 파일들을 동기화:
- `docker-compose.yml` (수정됨)
- `package.json` (수정됨)
- `.gitignore` (수정됨)
- `.env.example` (신규)
- `prisma/` 폴더 전체 (신규)
- `lib/prisma.ts` (신규)
- `scripts/test-db.mjs` (신규)

## NAS 배포 단계

### Step 1: 환경변수 설정
```bash
# NAS SSH 접속 후
cd /volume1/docker/naver-crawler

# .env 파일 생성
cp .env.example .env

# .env 확인 (DATABASE_URL이 올바른지 확인)
cat .env
```

**중요**: `.env` 파일의 `DATABASE_URL`은 이미 Docker 내부 네트워크용으로 설정되어 있어 수정 불필요
```
DATABASE_URL="postgresql://crawler_user:crawler_pass_2025@localhost:5432/naver_crawler?schema=public"
```

### Step 2: 기존 컨테이너 종료
```bash
docker-compose down
```

### Step 3: 새 이미지 빌드 및 시작
```bash
# Prisma 패키지 설치를 위해 재빌드
docker-compose build --no-cache web

# 컨테이너 시작 (PostgreSQL 포함)
docker-compose up -d
```

### Step 4: 컨테이너 상태 확인
```bash
# 모든 컨테이너가 실행 중인지 확인
docker-compose ps

# 예상 결과:
# naver-crawler-db   running   0.0.0.0:5432->5432/tcp
# naver-crawler-web  running   0.0.0.0:3000->3000/tcp
```

### Step 5: PostgreSQL 헬스체크 확인
```bash
# DB 컨테이너 로그 확인
docker-compose logs db

# "database system is ready to accept connections" 메시지 확인
```

### Step 6: 웹 컨테이너에서 Prisma 설정
```bash
# 웹 컨테이너 접속
docker exec -it naver-crawler-web sh

# Prisma Client 생성
npm run db:generate

# 마이그레이션 실행 (테이블 생성)
npm run db:migrate

# 또는 개발 환경이므로:
npx prisma migrate deploy

# 컨테이너에서 빠져나오기
exit
```

### Step 7: 데이터베이스 연결 테스트
```bash
# 웹 컨테이너에서 테스트 실행
docker exec -it naver-crawler-web node scripts/test-db.mjs

# 예상 결과:
# ✅ Database connected successfully!
# 📊 Database Status:
#   - Complexes: 0
#   - Articles: 0
#   - Crawl History: 0
# 🎉 All tests passed!
```

### Step 8: 웹 애플리케이션 동작 확인
브라우저에서 확인:
```
http://[NAS-IP]:3000
```

**확인사항**:
1. ✅ 페이지가 정상적으로 로드되는가?
2. ✅ 즐겨찾기 기능이 작동하는가?
3. ✅ 크롤링 설정 페이지가 열리는가?
4. ✅ 콘솔에 데이터베이스 관련 에러가 없는가?

## 문제 해결

### 문제 1: Prisma Client가 생성되지 않음
```bash
docker exec -it naver-crawler-web sh
npm install
npm run db:generate
exit
docker-compose restart web
```

### 문제 2: 마이그레이션 실패
```bash
# DB 컨테이너가 완전히 시작될 때까지 대기
docker-compose logs -f db

# "database system is ready" 메시지 확인 후 재시도
docker exec -it naver-crawler-web npx prisma migrate deploy
```

### 문제 3: 웹 컨테이너가 DB 연결 실패
```bash
# docker-compose.yml의 depends_on 설정 확인
# 웹 컨테이너 환경변수 확인
docker exec -it naver-crawler-web env | grep DATABASE_URL

# 결과: DATABASE_URL=postgresql://crawler_user:...@db:5432/...
# (주의: 'db'가 호스트명이어야 함, localhost가 아님!)
```

### 문제 4: 포트 충돌 (5432)
```bash
# NAS에서 이미 PostgreSQL이 실행 중인 경우
# docker-compose.yml에서 포트 변경:
ports:
  - "5433:5432"  # 외부 5433으로 변경

# .env 파일은 변경 불필요 (내부 네트워크는 5432 사용)
```

## 확인 체크리스트

배포 후 다음 사항들을 확인하세요:

- [ ] PostgreSQL 컨테이너가 정상 실행 중
- [ ] 웹 컨테이너가 정상 실행 중
- [ ] 데이터베이스 연결 테스트 성공
- [ ] 웹 페이지 정상 로드
- [ ] 기존 즐겨찾기 기능 동작 (파일 기반)
- [ ] 크롤링 실행 가능
- [ ] Docker 로그에 에러 없음

## 데이터 영향도

현재 단계에서는:
- ✅ **기존 기능에 영향 없음**: 아직 API를 변경하지 않았으므로 파일 기반 저장 방식 그대로 동작
- ✅ **데이터베이스는 빈 상태**: 테이블만 생성되고 데이터는 없음
- ✅ **안전한 롤백 가능**: 문제 시 `docker-compose down` 후 이전 버전으로 복구

## 다음 단계 (배포 확인 후)

1. **데이터 마이그레이션 스크립트 작성**
   - 기존 JSON 파일 → PostgreSQL 이관
   - 즐겨찾기, 크롤링 결과 등

2. **API 라우트 업데이트**
   - `/api/results` - Prisma 사용하도록 변경
   - `/api/crawl` - 크롤링 결과를 DB에 저장
   - `/api/favorites` - 즐겨찾기 DB 관리

3. **새로운 기능 추가**
   - 크롤링 히스토리 조회
   - 알림 설정 (Phase 2)
   - 스케줄링 (Phase 3)

## 보안 주의사항

⚠️ `.env` 파일은 절대 Git에 커밋하지 마세요!
- 데이터베이스 비밀번호 포함
- `.gitignore`에 이미 추가됨

운영 환경에서는 비밀번호 변경 권장:
```bash
# .env 파일에서 비밀번호 수정 후
docker-compose down
docker volume rm nas_naver_crawler_postgres_data  # 데이터 초기화
docker-compose up -d
```

## 참고 명령어

```bash
# Prisma Studio 실행 (GUI 데이터베이스 뷰어)
docker exec -it naver-crawler-web npm run db:studio
# 접속: http://localhost:5555

# 데이터베이스 스키마 확인
docker exec -it naver-crawler-web npx prisma db pull

# PostgreSQL에 직접 접속
docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler

# 컨테이너 로그 실시간 모니터링
docker-compose logs -f web
docker-compose logs -f db
```
