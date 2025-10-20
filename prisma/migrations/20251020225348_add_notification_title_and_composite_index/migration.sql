-- AlterTable: Add title column to notifications table
ALTER TABLE "notifications" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';

-- CreateIndex: Add composite index for optimized notification queries
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);
