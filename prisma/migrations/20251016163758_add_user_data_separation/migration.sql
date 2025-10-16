-- AlterTable: 사용자 role을 GUEST로 기본값 변경 (ADMIN, FAMILY, GUEST)
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'GUEST';

-- CreateIndex: Complex에 userId 컬럼 추가 (NOT NULL이므로 기본값 필요)
-- 1단계: NULL 허용으로 컬럼 추가
ALTER TABLE "complexes" ADD COLUMN "userId" TEXT;

-- 2단계: 기존 데이터에 첫 번째 ADMIN 사용자 ID 할당
-- (첫 번째 사용자가 없으면 임시 UUID 사용)
UPDATE "complexes"
SET "userId" = COALESCE(
  (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "userId" IS NULL;

-- 3단계: NOT NULL 제약조건 추가
ALTER TABLE "complexes" ALTER COLUMN "userId" SET NOT NULL;

-- 4단계: Foreign Key 추가
ALTER TABLE "complexes" ADD CONSTRAINT "complexes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5단계: Index 추가
CREATE INDEX "complexes_userId_idx" ON "complexes"("userId");

-- CrawlHistory에 userId 추가
ALTER TABLE "crawl_history" ADD COLUMN "userId" TEXT;

UPDATE "crawl_history"
SET "userId" = COALESCE(
  (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "userId" IS NULL;

ALTER TABLE "crawl_history" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "crawl_history" ADD CONSTRAINT "crawl_history_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "crawl_history_userId_idx" ON "crawl_history"("userId");

-- Favorite에 userId 추가 및 unique 제약조건 수정
ALTER TABLE "favorites" ADD COLUMN "userId" TEXT;

UPDATE "favorites"
SET "userId" = COALESCE(
  (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "userId" IS NULL;

ALTER TABLE "favorites" ALTER COLUMN "userId" SET NOT NULL;

-- 기존 unique 제약조건 삭제
ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_complexId_key";

-- 새로운 unique 제약조건 추가 (complexId + userId)
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_complexId_userId_key" UNIQUE ("complexId", "userId");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

-- Alert에 userId 추가
ALTER TABLE "alerts" ADD COLUMN "userId" TEXT;

UPDATE "alerts"
SET "userId" = COALESCE(
  (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "userId" IS NULL;

ALTER TABLE "alerts" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- Schedule에 userId 추가
ALTER TABLE "schedules" ADD COLUMN "userId" TEXT;

UPDATE "schedules"
SET "userId" = COALESCE(
  (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "userId" IS NULL;

ALTER TABLE "schedules" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "schedules" ADD CONSTRAINT "schedules_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "schedules_userId_idx" ON "schedules"("userId");

-- Group에 userId 추가
ALTER TABLE "groups" ADD COLUMN "userId" TEXT;

UPDATE "groups"
SET "userId" = COALESCE(
  (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "userId" IS NULL;

ALTER TABLE "groups" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "groups" ADD CONSTRAINT "groups_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "groups_userId_idx" ON "groups"("userId");

-- UsefulLink에 userId 추가
ALTER TABLE "useful_links" ADD COLUMN "userId" TEXT;

UPDATE "useful_links"
SET "userId" = COALESCE(
  (SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1),
  '00000000-0000-0000-0000-000000000000'
)
WHERE "userId" IS NULL;

ALTER TABLE "useful_links" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "useful_links" ADD CONSTRAINT "useful_links_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "useful_links_userId_idx" ON "useful_links"("userId");
