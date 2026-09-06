-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "tilesError" TEXT,
ADD COLUMN     "tilesJobId" TEXT,
ADD COLUMN     "tilesState" TEXT,
ADD COLUMN     "tilesUpdatedAt" TIMESTAMP(3);
