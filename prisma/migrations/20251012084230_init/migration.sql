-- CreateTable
CREATE TABLE "complexes" (
    "id" TEXT NOT NULL,
    "complexNo" TEXT NOT NULL,
    "complexName" TEXT NOT NULL,
    "totalHousehold" INTEGER,
    "totalDong" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "roadAddress" TEXT,
    "jibunAddress" TEXT,
    "beopjungdong" TEXT,
    "haengjeongdong" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "articleNo" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "realEstateTypeName" TEXT NOT NULL,
    "tradeTypeName" TEXT NOT NULL,
    "dealOrWarrantPrc" TEXT NOT NULL,
    "rentPrc" TEXT,
    "area1" DOUBLE PRECISION NOT NULL,
    "area2" DOUBLE PRECISION,
    "floorInfo" TEXT,
    "direction" TEXT,
    "articleConfirmYmd" TEXT,
    "tagList" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_history" (
    "id" TEXT NOT NULL,
    "complexNos" TEXT[],
    "totalComplexes" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "totalArticles" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "complexIds" TEXT[],
    "tradeTypes" TEXT[],
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "minArea" DOUBLE PRECISION,
    "maxArea" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "notifyBrowser" BOOLEAN NOT NULL DEFAULT true,
    "notifyWebhook" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "articleId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "complexNos" TEXT[],
    "cronExpr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_logs" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "articlesCount" INTEGER,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "complexes_complexNo_key" ON "complexes"("complexNo");

-- CreateIndex
CREATE INDEX "complexes_complexNo_idx" ON "complexes"("complexNo");

-- CreateIndex
CREATE INDEX "complexes_complexName_idx" ON "complexes"("complexName");

-- CreateIndex
CREATE UNIQUE INDEX "articles_articleNo_key" ON "articles"("articleNo");

-- CreateIndex
CREATE INDEX "articles_complexId_idx" ON "articles"("complexId");

-- CreateIndex
CREATE INDEX "articles_tradeTypeName_idx" ON "articles"("tradeTypeName");

-- CreateIndex
CREATE INDEX "articles_dealOrWarrantPrc_idx" ON "articles"("dealOrWarrantPrc");

-- CreateIndex
CREATE INDEX "articles_articleConfirmYmd_idx" ON "articles"("articleConfirmYmd");

-- CreateIndex
CREATE INDEX "crawl_history_createdAt_idx" ON "crawl_history"("createdAt");

-- CreateIndex
CREATE INDEX "crawl_history_status_idx" ON "crawl_history"("status");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_complexId_key" ON "favorites"("complexId");

-- CreateIndex
CREATE INDEX "alerts_isActive_idx" ON "alerts"("isActive");

-- CreateIndex
CREATE INDEX "notification_logs_alertId_idx" ON "notification_logs"("alertId");

-- CreateIndex
CREATE INDEX "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");

-- CreateIndex
CREATE INDEX "schedules_isActive_idx" ON "schedules"("isActive");

-- CreateIndex
CREATE INDEX "schedules_nextRun_idx" ON "schedules"("nextRun");

-- CreateIndex
CREATE INDEX "schedule_logs_scheduleId_idx" ON "schedule_logs"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_logs_executedAt_idx" ON "schedule_logs"("executedAt");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "complexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "complexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_logs" ADD CONSTRAINT "schedule_logs_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
