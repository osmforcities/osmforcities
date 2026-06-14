-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "contributorsCount" INTEGER,
ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "recentlyEditedCount" INTEGER;

-- CreateIndex
CREATE INDEX "datasets_lastEditedAt_idx" ON "datasets"("lastEditedAt");

-- CreateIndex
CREATE INDEX "datasets_contributorsCount_idx" ON "datasets"("contributorsCount");

-- CreateIndex
CREATE INDEX "datasets_recentlyEditedCount_idx" ON "datasets"("recentlyEditedCount");

-- Backfill from existing stats JSON
UPDATE "datasets"
SET
  "lastEditedAt"        = (stats->>'mostRecentElement')::timestamptz,
  "contributorsCount"   = (stats->>'editorsCount')::int,
  "recentlyEditedCount" = (stats->'recentActivity'->>'elementsEdited')::int
WHERE stats IS NOT NULL;
