-- 실거래가 캐시 테이블 간소화: 아파트별 캐싱 → 지역 단위 캐싱
-- 이전 문제점: lawdCd+dealYmd+aptName으로 캐싱 → API는 지역 전체 반환하는데 아파트별로 쪼개서 저장
-- 개선: lawdCd+dealYmd만으로 캐싱 → 지역 전체 한 번에 저장, 중복 API 호출 방지

-- Step 1: 기존 데이터 삭제 (스키마 변경으로 데이터 호환 안 됨)
TRUNCATE TABLE "real_price_cache";

-- Step 2: 기존 unique 제약조건 삭제
DROP INDEX IF EXISTS "real_price_cache_lawdCd_dealYmd_aptName_key";

-- Step 3: aptName 컬럼 삭제
ALTER TABLE "real_price_cache" DROP COLUMN IF EXISTS "aptName";

-- Step 4: 새로운 unique 제약조건 추가 (lawdCd + dealYmd만)
CREATE UNIQUE INDEX "real_price_cache_lawdCd_dealYmd_key" ON "real_price_cache"("lawdCd", "dealYmd");

-- Step 5: 불필요한 인덱스 정리
DROP INDEX IF EXISTS "real_price_cache_lawdCd_dealYmd_idx";  -- unique index로 대체됨
DROP INDEX IF EXISTS "real_price_cache_updatedAt_idx";       -- 실제 사용 안 함

-- 결과: 지역 단위 캐싱으로 API 중복 호출 방지, 성능 향상
