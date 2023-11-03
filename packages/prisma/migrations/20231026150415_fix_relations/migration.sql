/*
  Warnings:

  - You are about to drop the `cities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `countries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `regions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "cities";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "countries";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "regions";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "City" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "is_capital" BOOLEAN DEFAULT false,
    "regionId" INTEGER NOT NULL,
    CONSTRAINT "City_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Region" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" INTEGER NOT NULL,
    CONSTRAINT "Region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_slug_key" ON "City"("name_slug");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");
