-- Add parentId column to comments table for nested replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'parentId'
  ) THEN
    ALTER TABLE "comments" ADD COLUMN "parentId" TEXT;

    -- Add foreign key constraint
    ALTER TABLE "comments"
      ADD CONSTRAINT "comments_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "comments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;

    -- Add index
    CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");
  END IF;
END $$;

-- Create post_bookmarks table if not exists
CREATE TABLE IF NOT EXISTS "post_bookmarks" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "post_bookmarks_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_bookmarks_postId_userId_key'
  ) THEN
    ALTER TABLE "post_bookmarks"
      ADD CONSTRAINT "post_bookmarks_postId_userId_key"
      UNIQUE ("postId", "userId");
  END IF;
END $$;

-- Add foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_bookmarks_postId_fkey'
  ) THEN
    ALTER TABLE "post_bookmarks"
      ADD CONSTRAINT "post_bookmarks_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_bookmarks_userId_fkey'
  ) THEN
    ALTER TABLE "post_bookmarks"
      ADD CONSTRAINT "post_bookmarks_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "post_bookmarks_postId_idx" ON "post_bookmarks"("postId");
CREATE INDEX IF NOT EXISTS "post_bookmarks_userId_idx" ON "post_bookmarks"("userId");
