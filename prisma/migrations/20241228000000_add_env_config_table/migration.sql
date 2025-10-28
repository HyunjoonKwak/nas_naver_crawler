-- CreateTable
CREATE TABLE "env_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "env_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "env_configs_key_key" ON "env_configs"("key");

-- CreateIndex
CREATE INDEX "env_configs_category_idx" ON "env_configs"("category");

-- CreateIndex
CREATE INDEX "env_configs_isActive_idx" ON "env_configs"("isActive");
