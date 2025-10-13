# Database Schema Fix Summary

## Problem Identified

The Prisma schema defined a `crawl_history` table, but the actual NAS database (`naver_realestate`) only had a `crawl_jobs` table with a completely different structure. This caused all Prisma queries to fail with "column does not exist" errors.

## Root Cause

Two different database schemas were in use:
- **Prisma schema.prisma**: Defined `crawl_history` table for tracking crawl progress
- **Actual NAS database**: Only had legacy `crawl_jobs` table, missing the `crawl_history` table entirely

## Solution Applied

### 1. Created `crawl_history` Table ✅

Created the missing table in the NAS database with correct snake_case column names:

```sql
CREATE TABLE crawl_history (
  id VARCHAR(36) PRIMARY KEY,
  complex_nos TEXT[],
  total_complexes INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  total_articles INTEGER,
  duration INTEGER,
  status VARCHAR(20),
  error_message TEXT,
  current_step VARCHAR(255),        -- Maps to currentStep in Prisma
  processed_articles INTEGER,       -- Maps to processedArticles
  processed_complexes INTEGER,      -- Maps to processedComplexes
  created_at TIMESTAMP WITH TIME ZONE,  -- Maps to createdAt
  updated_at TIMESTAMP WITH TIME ZONE   -- Maps to updatedAt
);
```

### 2. Verified Column Mapping

The Prisma schema already has correct `@map` decorators:

```prisma
model CrawlHistory {
  currentStep       String?  @map("current_step")
  processedArticles Int      @map("processed_articles")
  processedComplexes Int     @map("processed_complexes")
  createdAt         DateTime @map("created_at")
  updatedAt         DateTime @map("updated_at")

  @@map("crawl_history")
}
```

## Database Details

- **Database Name**: `naver_realestate`
- **Container**: `naver_realestate_db`
- **User**: `postgres`
- **Port**: `5433` (external) → `5432` (internal)

## Existing Tables in Database

1. `article_changes` - Article change tracking
2. `article_history` - Historical article data
3. `article_snapshots` - Article snapshots
4. `articles` - Current articles
5. `complexes` - Complex/building information
6. `crawl_jobs` - Legacy crawl job tracking
7. `favorite_complexes` - User favorites
8. `transactions` - Transaction records
9. `users` - User accounts
10. **`crawl_history`** - ✅ **NEWLY CREATED**

## Next Steps for Deployment

### Option 1: Use manage.sh (Recommended)

```bash
cd /Users/specialrisk_mac/code_work/nas_naver_crawler
./manage.sh
# Select option to rebuild and restart
```

### Option 2: Manual Docker Commands

```bash
# 1. Rebuild the image (if Dockerfile changed)
docker-compose build --no-cache web

# 2. Start the services
docker-compose up -d

# 3. Regenerate Prisma client in container
docker exec <web-container-name> npx prisma generate

# 4. Check logs
docker-compose logs -f web
```

## Testing After Deployment

1. **Start a crawl** via the web interface
2. **Monitor real-time progress** - should now update correctly
3. **Check database** to verify records are being written:

```bash
docker exec naver_realestate_db psql -U postgres -d naver_realestate \
  -c "SELECT id, status, current_step, processed_complexes, total_complexes FROM crawl_history ORDER BY created_at DESC LIMIT 5;"
```

## Key Changes Made in Code

### 1. Python Crawler ([logic/nas_playwright_crawler.py](logic/nas_playwright_crawler.py))
- Added psycopg2 database connection
- Added real-time DB updates in `update_status()` method
- Added crawl_id parameter for tracking

### 2. Crawler API ([app/api/crawl/route.ts](app/api/crawl/route.ts))
- Creates crawl record in DB before starting Python script
- Passes crawl_id to Python via command-line argument
- Increased timeout to 30 minutes

### 3. Status API ([app/api/crawl-status/route.ts](app/api/crawl-status/route.ts))
- Queries `crawl_history` table for real-time progress
- Returns progress percentage, processed counts, duration

### 4. Frontend ([components/CrawlerForm.tsx](components/CrawlerForm.tsx))
- Polls `/api/crawl-status` every 2 seconds
- Displays real-time progress bar and statistics
- Shows current step, processed complexes, articles collected

## Environment Variables Required

Ensure `.env` or `config.env` has correct database URL:

```env
DATABASE_URL="postgresql://postgres:your_password@naver_realestate_db:5432/naver_realestate?schema=public"
```

## Verification Checklist

- [x] `crawl_history` table created in database
- [x] Table has all required columns with snake_case names
- [x] Prisma schema has @map decorators for column mapping
- [ ] Web container deployed and running
- [ ] Prisma client regenerated in container
- [ ] Test crawl shows real-time progress (0% → 100%)
- [ ] Database records are created and updated during crawl

## Troubleshooting

If you still see "column does not exist" errors after deployment:

1. **Check Prisma client generation**:
   ```bash
   docker exec <web-container> npx prisma generate
   ```

2. **Verify table structure**:
   ```bash
   docker exec naver_realestate_db psql -U postgres -d naver_realestate -c "\d crawl_history"
   ```

3. **Check container logs**:
   ```bash
   docker logs <web-container> --tail 100 -f
   ```

4. **Restart container** to reload Prisma client:
   ```bash
   docker-compose restart web
   ```

---

**Status**: ✅ Database schema fixed, ready for deployment
**Date**: 2025-10-13
