/*
  Warnings:

  - You are about to drop the column `lastEdited` on the `monitors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "monitors" DROP COLUMN "lastEdited",
ADD COLUMN     "stats" JSONB;
