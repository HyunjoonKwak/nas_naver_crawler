-- Add numeric price columns to articles table for performance optimization
-- AlterTable
ALTER TABLE "articles" ADD COLUMN "deal_or_warrant_prc_won" BIGINT;
ALTER TABLE "articles" ADD COLUMN "rent_prc_won" BIGINT;

-- CreateIndex
CREATE INDEX "articles_deal_or_warrant_prc_won_idx" ON "articles"("deal_or_warrant_prc_won");
CREATE INDEX "articles_rent_prc_won_idx" ON "articles"("rent_prc_won");
CREATE INDEX "articles_createdAt_idx" ON "articles"("createdAt");
