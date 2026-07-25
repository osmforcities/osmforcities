-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "filterableTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
