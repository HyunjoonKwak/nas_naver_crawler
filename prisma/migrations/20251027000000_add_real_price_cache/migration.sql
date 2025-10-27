-- CreateTable
CREATE TABLE "real_price_cache" (
    "id" TEXT NOT NULL,
    "lawdCd" TEXT NOT NULL,
    "dealYmd" TEXT NOT NULL,
    "aptName" TEXT NOT NULL,
    "cachedData" JSONB NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "real_price_cache_lawdCd_dealYmd_aptName_key" ON "real_price_cache"("lawdCd", "dealYmd", "aptName");

-- CreateIndex
CREATE INDEX "real_price_cache_lawdCd_dealYmd_idx" ON "real_price_cache"("lawdCd", "dealYmd");

-- CreateIndex
CREATE INDEX "real_price_cache_expiresAt_idx" ON "real_price_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "real_price_cache_updatedAt_idx" ON "real_price_cache"("updatedAt");
