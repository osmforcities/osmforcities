/*
  Warnings:

  - You are about to drop the column `osmRelationId` on the `monitors` table. All the data in the column will be lost.
  - You are about to drop the `osm_relations` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,templateId,areaId]` on the table `monitors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `areaId` to the `monitors` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "monitors" DROP CONSTRAINT "monitors_osmRelationId_fkey";

-- DropIndex
DROP INDEX "monitors_userId_templateId_osmRelationId_key";

-- AlterTable
ALTER TABLE "monitors" DROP COLUMN "osmRelationId",
ADD COLUMN     "areaId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "osm_relations";

-- CreateTable
CREATE TABLE "areas" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "bounds" TEXT,
    "geojson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monitors_userId_templateId_areaId_key" ON "monitors"("userId", "templateId", "areaId");

-- AddForeignKey
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
