-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAttempted" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT;

-- CreateIndex
CREATE INDEX "datasets_isActive_lastAttempted_idx" ON "datasets"("isActive", "lastAttempted");
