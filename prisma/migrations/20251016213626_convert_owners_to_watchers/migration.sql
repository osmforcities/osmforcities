-- Add default value for id column to fix schema
ALTER TABLE "dataset_watches" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Convert dataset owners to watchers
INSERT INTO
  "dataset_watches" ("userId", "datasetId", "createdAt")
SELECT
  "userId",
  id,
  "createdAt"
FROM
  "datasets"
WHERE
  "userId" IS NOT NULL ON CONFLICT ("userId", "datasetId") DO NOTHING;

-- Update unique constraint
ALTER TABLE "datasets"
DROP CONSTRAINT IF EXISTS "Dataset_userId_templateId_areaId_key";

ALTER TABLE "datasets" ADD CONSTRAINT "Dataset_templateId_areaId_key" UNIQUE ("templateId", "areaId");

-- Remove ownership
UPDATE "datasets"
SET
  "userId" = NULL,
  "isPublic" = true;

-- Remove isPublic column (all datasets are public by default now)
ALTER TABLE "datasets" DROP COLUMN "isPublic";