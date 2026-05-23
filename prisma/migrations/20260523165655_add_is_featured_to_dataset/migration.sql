-- DropIndex
DROP INDEX "datasets_userId_templateId_areaId_key";

-- AlterTable
ALTER TABLE "dataset_watches" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- RenameIndex
ALTER INDEX "Dataset_templateId_areaId_key" RENAME TO "datasets_templateId_areaId_key";
