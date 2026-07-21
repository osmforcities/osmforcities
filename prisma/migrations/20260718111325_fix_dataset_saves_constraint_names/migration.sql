-- Rename constraints/indexes left behind by the dataset_watches -> dataset_saves
-- table rename (20260618075936), which renamed the table only.

-- AlterTable
ALTER TABLE "dataset_saves" RENAME CONSTRAINT "dataset_watches_pkey" TO "dataset_saves_pkey";

-- RenameForeignKey
ALTER TABLE "dataset_saves" RENAME CONSTRAINT "dataset_watches_datasetId_fkey" TO "dataset_saves_datasetId_fkey";

-- RenameForeignKey
ALTER TABLE "dataset_saves" RENAME CONSTRAINT "dataset_watches_userId_fkey" TO "dataset_saves_userId_fkey";

-- RenameIndex
ALTER INDEX "dataset_watches_userId_datasetId_key" RENAME TO "dataset_saves_userId_datasetId_key";
