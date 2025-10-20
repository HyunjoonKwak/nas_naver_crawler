-- createdAt이 null인 단지들의 createdAt을 updatedAt으로 설정
-- 실행 방법:
-- docker exec -it naver-crawler-db psql -U crawler_user -d naver_crawler -f /app/scripts/fix-created-at.sql

BEGIN;

-- 1. 현재 상태 확인
SELECT
  COUNT(*) as total_complexes,
  COUNT(created_at) as with_created_at,
  COUNT(*) - COUNT(created_at) as null_created_at
FROM complexes;

-- 2. createdAt이 null인 단지들을 updatedAt으로 채우기
UPDATE complexes
SET created_at = updated_at
WHERE created_at IS NULL;

-- 3. 결과 확인
SELECT
  COUNT(*) as total_complexes,
  COUNT(created_at) as with_created_at,
  COUNT(*) - COUNT(created_at) as null_created_at
FROM complexes;

-- 4. 샘플 데이터 확인
SELECT
  complex_no,
  complex_name,
  created_at,
  updated_at,
  created_at = updated_at as was_null
FROM complexes
ORDER BY updated_at DESC
LIMIT 10;

COMMIT;
