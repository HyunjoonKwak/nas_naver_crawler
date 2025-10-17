# 커뮤니티 기능 마이그레이션 빠른 가이드

## 🚀 NAS에서 실행할 명령어

### ⚠️ 중요: 반드시 순서대로 실행하세요!

```bash
# ==========================================
# 1단계: NAS SSH 접속
# ==========================================
ssh admin@NAS주소


# ==========================================
# 2단계: 작업 디렉토리 이동
# ==========================================
cd /volume1/code_work/nas_naver_crawler


# ==========================================
# 3단계: 백업 (중요!)
# ==========================================
docker exec -t naver-crawler-db pg_dump -U crawler naver_crawler > backup_community_$(date +%Y%m%d_%H%M%S).sql


# ==========================================
# 4단계: 완전한 캐시 클리어 (캐시 문제 해결)
# ==========================================

# 모든 컨테이너 중지 및 삭제
docker-compose down -v

# Prisma 캐시 삭제
rm -rf .next 2>/dev/null || true

# Docker 이미지 삭제
docker rmi naver-crawler-web:latest 2>/dev/null || true
docker rmi nas_naver_crawler-web:latest 2>/dev/null || true

# Docker 빌드 캐시 삭제
docker builder prune -af


# ==========================================
# 5단계: 코드 업데이트
# ==========================================
git pull origin main


# ==========================================
# 6단계: Docker 완전 재빌드 (캐시 없이)
# ==========================================
docker-compose build --no-cache

# 컨테이너 시작
docker-compose up -d

# 로그 확인 (Ctrl+C로 종료 가능)
docker-compose logs -f naver-crawler-web
# "✓ Ready in XXXms" 메시지 확인 후 Ctrl+C


# ==========================================
# 7단계: Prisma 캐시 완전 삭제 및 재생성
# ==========================================
docker exec -it naver-crawler-web sh

# 컨테이너 내부에서 실행:
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
rm -rf .next
npx prisma generate --force

# 생성 확인
ls -la node_modules/.prisma/client/

# 컨테이너 나가기
exit


# ==========================================
# 8단계: 마이그레이션 실행
# ==========================================
docker exec -it naver-crawler-web sh

# 컨테이너 내부에서 실행:
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status

# 컨테이너 나가기
exit


# ==========================================
# 9단계: Docker 최종 재시작
# ==========================================
docker-compose restart

# 로그 확인
docker-compose logs -f naver-crawler-web
# "✓ Ready in XXXms" 메시지 확인 후 Ctrl+C


# ==========================================
# 10단계: 테이블 생성 확인
# ==========================================
docker exec -it naver-crawler-db psql -U crawler -d naver_crawler

# PostgreSQL 내부에서 실행:
\dt

# 다음 테이블들이 보여야 함:
# - posts
# - comments
# - post_likes
# - post_images
# - post_reports
# - comment_reports
# - notifications

# 종료
\q


# ==========================================
# 완료! 웹 브라우저에서 확인
# ==========================================
# http://NAS주소:3000
# 로그인 후 "커뮤니티" 메뉴 확인
```

---

## ✅ 성공 확인 체크리스트

- [ ] 백업 파일 생성됨 (`ls -lh backup_community_*.sql`)
- [ ] Docker 재빌드 성공 (에러 없음)
- [ ] Prisma Client 재생성 성공 (`node_modules/.prisma/client/` 존재)
- [ ] 마이그레이션 실행 성공 (에러 없음)
- [ ] 커뮤니티 테이블 7개 생성됨 (`\dt` 결과)
- [ ] 웹 서버 정상 시작 ("✓ Ready" 메시지)
- [ ] 웹에서 커뮤니티 메뉴 보임

---

## ❌ 문제 발생시

### 문제 1: "Unknown field" 에러
```bash
# Prisma 캐시 완전 삭제 후 재생성
docker exec naver-crawler-web rm -rf node_modules/.prisma
docker exec naver-crawler-web rm -rf node_modules/@prisma/client
docker exec naver-crawler-web npx prisma generate --force
docker-compose restart
```

### 문제 2: 마이그레이션 실패
```bash
# 마이그레이션 상태 확인
docker exec naver-crawler-web npx prisma migrate status

# 백업 복원
cat backup_community_YYYYMMDD_HHMMSS.sql | docker exec -i naver-crawler-db psql -U crawler naver_crawler

# 처음부터 다시 시도
```

### 문제 3: Docker 빌드 에러
```bash
# 완전 초기화
docker-compose down -v
docker system prune -af
docker builder prune -af

# 처음부터 다시 시작 (5단계부터)
```

---

## 📋 상세 가이드

더 자세한 설명은 `docs/COMMUNITY_MIGRATION.md` 참고

---

## 🎯 구현된 기능

### 백엔드 API
- ✅ 게시글 CRUD (18개 엔드포인트)
- ✅ 댓글 CRUD
- ✅ Q&A 답변 채택
- ✅ 좋아요
- ✅ 신고 시스템
- ✅ 알림 시스템

### 프론트엔드 UI
- ✅ 커뮤니티 메인 페이지 (3개 탭)
- ✅ 게시글 상세 페이지
- ✅ 게시글 작성/수정 페이지
- ✅ 반응형 디자인
- ✅ 다크모드 지원

### 데이터베이스
- ✅ 9개 테이블 추가
- ✅ 4개 Enum 추가
- ✅ Soft Delete 패턴
- ✅ 인덱스 최적화

---

## 💡 팁

1. **백업은 필수!** 마이그레이션 전에 반드시 백업하세요
2. **캐시 삭제 중요!** 캐시 문제로 필드가 생성 안될 수 있습니다
3. **순서 지키기!** 단계를 건너뛰지 마세요
4. **로그 확인!** 각 단계마다 에러 없는지 확인하세요

---

## 📞 문의

문제 발생시:
```bash
# 로그 확인
docker-compose logs naver-crawler-web
docker-compose logs naver-crawler-db

# 컨테이너 상태 확인
docker-compose ps

# 마이그레이션 상태 확인
docker exec naver-crawler-web npx prisma migrate status
```
