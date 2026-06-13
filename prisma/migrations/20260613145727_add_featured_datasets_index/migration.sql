-- DropIndex
DROP INDEX IF EXISTS "datasets_userId_templateId_areaId_key";

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "dataset_watches" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "datasets_isFeatured_createdAt_idx" ON "datasets"("isFeatured", "createdAt");

-- RenameIndex
ALTER INDEX "Dataset_templateId_areaId_key" RENAME TO "datasets_templateId_areaId_key";
