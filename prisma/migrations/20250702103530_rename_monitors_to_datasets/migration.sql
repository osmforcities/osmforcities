-- Rename tables
ALTER TABLE "monitors"
RENAME TO "datasets";

ALTER TABLE "monitor_watches"
RENAME TO "dataset_watches";

-- Rename indexes
ALTER INDEX "monitors_pkey"
RENAME TO "datasets_pkey";

ALTER INDEX "monitors_userId_templateId_areaId_key"
RENAME TO "datasets_userId_templateId_areaId_key";

ALTER INDEX "monitor_watches_pkey"
RENAME TO "dataset_watches_pkey";

ALTER INDEX "monitor_watches_userId_monitorId_key"
RENAME TO "dataset_watches_userId_datasetId_key";

-- Update foreign key references
ALTER TABLE "dataset_watches"
RENAME COLUMN "monitorId" TO "datasetId";