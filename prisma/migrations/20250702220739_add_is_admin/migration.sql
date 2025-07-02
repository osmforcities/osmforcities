-- DropForeignKey
ALTER TABLE "datasets" DROP CONSTRAINT "datasets_templateId_fkey";

-- AlterTable
ALTER TABLE "templates" RENAME CONSTRAINT "data_templates_pkey" TO "templates_pkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- RenameForeignKey
ALTER TABLE "dataset_watches" RENAME CONSTRAINT "monitor_watches_monitorId_fkey" TO "dataset_watches_datasetId_fkey";

-- RenameForeignKey
ALTER TABLE "dataset_watches" RENAME CONSTRAINT "monitor_watches_userId_fkey" TO "dataset_watches_userId_fkey";

-- RenameForeignKey
ALTER TABLE "datasets" RENAME CONSTRAINT "monitors_areaId_fkey" TO "datasets_areaId_fkey";

-- RenameForeignKey
ALTER TABLE "datasets" RENAME CONSTRAINT "monitors_userId_fkey" TO "datasets_userId_fkey";

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
