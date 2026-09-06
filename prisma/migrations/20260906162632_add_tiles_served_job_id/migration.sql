-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "tilesServedJobId" TEXT;

-- Backfill: rows whose latest job completed are serving that archive today
UPDATE "datasets" SET "tilesServedJobId" = "tilesJobId" WHERE "tilesState" = 'done';
