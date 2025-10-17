# 커뮤니티 기능 마이그레이션 가이드

## 개요
이 마이그레이션은 커뮤니티 기능(자유게시판, Q&A, 공지사항)을 추가합니다.

### 주요 기능
- **자유게시판**: 일반적인 정보 공유
- **Q&A**: 질문과 답변, 답변 채택 기능
- **공지사항**: 관리자만 작성 가능, 자동 상단 고정
- **댓글 시스템**: 1-레벨 댓글 (대댓글 없음)
- **좋아요**: 게시글 좋아요
- **신고**: 게시글/댓글 신고 및 관리자 처리
- **알림**: 댓글 작성, Q&A 답변 채택시 자동 알림

---

## 🚨 중요: 캐시 문제 해결

기존에 Prisma 마이그레이션시 캐시 문제로 필드가 생성되지 않는 문제가 있었습니다.
**반드시 아래 순서대로 진행하세요:**

### 1단계: 완전한 캐시 클리어 (필수!)

```bash
# NAS에 SSH 접속
ssh admin@nas주소

# 작업 디렉토리로 이동
cd /volume1/code_work/nas_naver_crawler

# 1. 모든 컨테이너 완전 중지 및 삭제
docker-compose down -v

# 2. Prisma 캐시 완전 삭제
docker exec naver-crawler-web rm -rf /app/node_modules/.prisma 2>/dev/null || true
docker exec naver-crawler-web rm -rf /app/.next 2>/dev/null || true

# 3. Docker 이미지 삭제 (재빌드 강제)
docker rmi naver-crawler-web:latest 2>/dev/null || true
docker rmi nas_naver_crawler-web:latest 2>/dev/null || true

# 4. Docker 빌드 캐시 삭제
docker builder prune -af

# 5. 볼륨 정리 (선택사항 - DB 데이터는 유지됨)
docker volume prune -f
```

---

## NAS 배포 절차

### 2단계: 코드 업데이트

```bash
cd /volume1/code_work/nas_naver_crawler
git pull origin main
```

### 3단계: 데이터베이스 백업 (중요!)

```bash
# 현재 날짜로 백업 파일 생성
docker exec -t naver-crawler-db pg_dump -U crawler naver_crawler > backup_community_$(date +%Y%m%d_%H%M%S).sql

# 백업 확인
ls -lh backup_community_*.sql
```

### 4단계: Docker 완전 재빌드 (캐시 없이)

```bash
# 캐시 없이 완전 재빌드
docker-compose build --no-cache

# 컨테이너 시작 (detached)
docker-compose up -d

# 로그 확인 (Ctrl+C로 종료)
docker-compose logs -f naver-crawler-web
```

### 5단계: Prisma 캐시 완전 삭제 및 재생성

```bash
# 컨테이너 내부로 진입
docker exec -it naver-crawler-web sh

# Prisma 관련 캐시 완전 삭제
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
rm -rf .next

# Prisma Client 완전 재생성
npx prisma generate --force

# 생성 확인
ls -la node_modules/.prisma/client/

# 컨테이너에서 나가기
exit
```

### 6단계: 마이그레이션 실행

```bash
# 컨테이너 내부로 다시 진입
docker exec -it naver-crawler-web sh

# 마이그레이션 상태 확인
npx prisma migrate status

# 마이그레이션 실행 (배포 환경)
npx prisma migrate deploy

# 또는 개발 환경 마이그레이션 (이름 지정)
npx prisma migrate dev --name add_community_tables

# 마이그레이션 성공 확인
npx prisma migrate status

# 컨테이너에서 나가기
exit
```

### 7단계: Docker 최종 재시작

```bash
# 컨테이너 재시작
docker-compose restart

# 로그 확인하여 에러 없는지 체크
docker-compose logs -f naver-crawler-web

# 정상 시작 확인:
# ✓ Compiled /instrumentation in XXXms
# ✓ Ready in XXXms
```

---

## 마이그레이션 내용

### 추가된 테이블 (9개)

1. **posts** - 게시글
   - id, title, content, category (FREE/QNA/NOTICE)
   - authorId (User 외래키)
   - views, likesCount (통계)
   - isResolved, acceptedCommentId (Q&A 전용)
   - isPinned, isDeleted (상태)
   - 인덱스: category, authorId, createdAt, isPinned, likesCount

2. **comments** - 댓글
   - id, content, postId, authorId
   - isAccepted (Q&A 답변 채택)
   - isDeleted (소프트 삭제)
   - 인덱스: postId, authorId

3. **post_likes** - 게시글 좋아요
   - id, postId, userId
   - UNIQUE 제약: (postId, userId)

4. **post_images** - 게시글 이미지 (향후 확장용)
   - id, postId, url, filename, size, order

5. **post_reports** - 게시글 신고
   - id, postId, reporterId
   - reason, description
   - status (PENDING/IN_REVIEW/RESOLVED/REJECTED)
   - adminNote, resolvedAt

6. **comment_reports** - 댓글 신고
   - 구조 동일 (post_reports와 유사)

7. **notifications** - 알림
   - id, userId, type, message
   - postId, commentId (선택적)
   - isRead

### 추가된 Enum (4개)

1. **PostCategory**: FREE, QNA, NOTICE
2. **NotificationType**: COMMENT, ACCEPTED, NOTICE
3. **ReportReason**: SPAM, ABUSE, INAPPROPRIATE, COPYRIGHT, FRAUD, ETC
4. **ReportStatus**: PENDING, IN_REVIEW, RESOLVED, REJECTED

### 변경된 테이블

- **users**: 커뮤니티 관계 추가
  - posts[], comments[], postLikes[]
  - postReports[], commentReports[]
  - notifications[]

---

## 마이그레이션 확인

### 데이터베이스 접속하여 테이블 확인

```bash
# PostgreSQL 접속
docker exec -it naver-crawler-db psql -U crawler -d naver_crawler

# 테이블 목록 확인
\dt

# 커뮤니티 테이블이 보여야 함:
# - posts
# - comments
# - post_likes
# - post_images
# - post_reports
# - comment_reports
# - notifications

# posts 테이블 구조 확인
\d posts

# 종료
\q
```

### API 동작 확인

```bash
# 웹 브라우저에서 접속
http://nas주소:3000

# 로그인 후 커뮤니티 메뉴 확인
# - 네비게이션에 "커뮤니티" 메뉴 보여야 함
# - 클릭시 /community 페이지 이동
```

---

## 문제 해결

### ❌ 문제 1: 필드가 생성되지 않음

**증상**: 마이그레이션 후에도 새 필드가 없다고 에러 발생

**원인**: Prisma 캐시 문제

**해결**:
```bash
# 1. 컨테이너 완전 중지
docker-compose down

# 2. 모든 캐시 삭제
docker exec naver-crawler-web rm -rf node_modules/.prisma
docker exec naver-crawler-web rm -rf node_modules/@prisma/client
docker exec naver-crawler-web rm -rf .next

# 3. 이미지 재빌드 (캐시 없이)
docker-compose build --no-cache

# 4. 재시작
docker-compose up -d

# 5. Prisma Client 강제 재생성
docker exec naver-crawler-web npx prisma generate --force

# 6. 마이그레이션 다시 실행
docker exec naver-crawler-web npx prisma migrate deploy
```

### ❌ 문제 2: 마이그레이션 실패

**증상**: `prisma migrate deploy` 실패

**원인**: 이전 마이그레이션 충돌 또는 스키마 불일치

**해결**:
```bash
# 마이그레이션 상태 확인
docker exec naver-crawler-web npx prisma migrate status

# 마이그레이션 히스토리 확인
docker exec -it naver-crawler-db psql -U crawler -d naver_crawler
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;
\q

# 실패한 마이그레이션 있으면 수동 해결 필요
# 또는 백업 복원 후 다시 시도
```

### ❌ 문제 3: TypeScript 타입 에러

**증상**: 코드에서 Prisma 타입 에러 발생

**원인**: Prisma Client가 최신 스키마를 반영하지 못함

**해결**:
```bash
# Prisma Client 강제 재생성
docker exec naver-crawler-web npx prisma generate --force

# 개발 서버 재시작
docker-compose restart naver-crawler-web
```

### ❌ 문제 4: Docker 빌드 캐시 문제

**증상**: 빌드가 빠르게 끝나지만 변경사항이 반영 안됨

**원인**: Docker 레이어 캐시

**해결**:
```bash
# 완전히 처음부터 빌드
docker-compose down -v
docker builder prune -af
docker-compose build --no-cache
docker-compose up -d
```

---

## 백업 및 복원

### 백업

```bash
# 전체 데이터베이스 백업
docker exec -t naver-crawler-db pg_dump -U crawler naver_crawler > backup_full_$(date +%Y%m%d_%H%M%S).sql

# 커뮤니티 테이블만 백업
docker exec -t naver-crawler-db pg_dump -U crawler -t posts -t comments -t post_likes -t post_images -t post_reports -t comment_reports -t notifications naver_crawler > backup_community_$(date +%Y%m%d_%H%M%S).sql
```

### 복원

```bash
# 전체 복원 (주의: 모든 데이터 덮어씀)
cat backup_full_YYYYMMDD_HHMMSS.sql | docker exec -i naver-crawler-db psql -U crawler naver_crawler

# 특정 테이블만 복원
cat backup_community_YYYYMMDD_HHMMSS.sql | docker exec -i naver-crawler-db psql -U crawler naver_crawler
```

---

## 마이그레이션 체크리스트

실행 전 체크리스트:

- [ ] 데이터베이스 백업 완료
- [ ] 코드 pull 완료 (git pull origin main)
- [ ] Docker 완전 중지 (docker-compose down -v)
- [ ] Prisma 캐시 삭제 완료
- [ ] Docker 빌드 캐시 삭제 완료
- [ ] 이미지 재빌드 완료 (--no-cache)
- [ ] Prisma Client 재생성 완료 (--force)
- [ ] 마이그레이션 실행 완료
- [ ] 마이그레이션 상태 확인 완료
- [ ] 테이블 생성 확인 완료 (\dt)
- [ ] 서비스 정상 작동 확인 완료

---

## 테스트 시나리오

마이그레이션 성공 후 테스트:

### 1. 기본 기능 테스트
- [ ] 로그인 후 커뮤니티 메뉴 보임
- [ ] 자유게시판/Q&A/공지사항 탭 전환
- [ ] 게시글 목록 조회

### 2. 게시글 작성
- [ ] 자유게시판 글쓰기
- [ ] Q&A 질문 작성
- [ ] (관리자) 공지사항 작성

### 3. 댓글 기능
- [ ] 댓글 작성
- [ ] 댓글 수정
- [ ] 댓글 삭제

### 4. Q&A 기능
- [ ] Q&A 질문 작성
- [ ] 답변 작성
- [ ] 답변 채택 (질문 작성자)
- [ ] 해결됨 뱃지 표시

### 5. 좋아요 기능
- [ ] 게시글 좋아요
- [ ] 좋아요 취소
- [ ] 좋아요 수 실시간 반영

### 6. 알림 기능
- [ ] 댓글 작성시 알림 생성
- [ ] 답변 채택시 알림 생성
- [ ] 알림 읽음 처리
- [ ] 알림 삭제

---

## 완료 후 확인사항

```bash
# 1. 서비스 정상 작동 확인
curl http://localhost:3000/api/posts

# 응답: {"success":true,"posts":[...],"pagination":{...}}

# 2. 로그 확인 (에러 없어야 함)
docker-compose logs --tail=100 naver-crawler-web | grep -i error

# 3. 데이터베이스 연결 확인
docker exec naver-crawler-web npx prisma db push --accept-data-loss

# 4. 전체 서비스 상태 확인
docker-compose ps
# 모든 서비스 "Up" 상태여야 함
```

---

## 롤백 방법

문제 발생시 이전 상태로 롤백:

```bash
# 1. 컨테이너 중지
docker-compose down

# 2. 백업 복원
cat backup_community_YYYYMMDD_HHMMSS.sql | docker exec -i naver-crawler-db psql -U crawler naver_crawler

# 3. 이전 코드로 되돌리기
git log --oneline -10
git reset --hard <이전_커밋_해시>

# 4. 재빌드 및 시작
docker-compose build --no-cache
docker-compose up -d
```

---

## 참고사항

### Prisma 마이그레이션 명령어 차이

- `npx prisma migrate deploy`: 프로덕션 환경 (NAS 배포시 사용)
  - 마이그레이션 파일만 적용
  - 스키마 변경 감지 안함
  - 안전함

- `npx prisma migrate dev`: 개발 환경
  - 스키마 변경 감지
  - 마이그레이션 파일 자동 생성
  - DB 리셋 가능

### 캐시 관련 팁

1. **Prisma 캐시 위치**
   - `/app/node_modules/.prisma/client/`
   - `/app/node_modules/@prisma/client/`

2. **Next.js 캐시 위치**
   - `/app/.next/`

3. **Docker 빌드 캐시**
   - `docker builder prune -af`로 삭제

4. **완전 초기화 명령**
   ```bash
   docker-compose down -v
   docker system prune -af
   docker volume prune -f
   ```

---

## 문의

문제 발생시 확인할 로그:
```bash
# 웹 서버 로그
docker-compose logs naver-crawler-web

# DB 로그
docker-compose logs naver-crawler-db

# 실시간 로그
docker-compose logs -f
```
