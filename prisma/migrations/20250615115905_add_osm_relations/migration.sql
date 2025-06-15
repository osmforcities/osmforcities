/*
  Warnings:

  - You are about to drop the column `cityBounds` on the `monitors` table. All the data in the column will be lost.
  - You are about to drop the column `countryCode` on the `monitors` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,templateId,osmRelationId]` on the table `monitors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `osmRelationId` to the `monitors` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "monitors_userId_templateId_cityName_key";

-- AlterTable
ALTER TABLE "monitors" DROP COLUMN "cityBounds",
DROP COLUMN "countryCode",
ADD COLUMN     "osmRelationId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "osm_relations" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "bounds" TEXT,
    "geojson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "osm_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monitors_userId_templateId_osmRelationId_key" ON "monitors"("userId", "templateId", "osmRelationId");

-- AddForeignKey
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_osmRelationId_fkey" FOREIGN KEY ("osmRelationId") REFERENCES "osm_relations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
