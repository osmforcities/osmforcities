/*
  Warnings:

  - Added the required column `name_slug` to the `Region` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_slug` to the `Country` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "City_name_slug_key";

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Region" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" INTEGER NOT NULL,
    CONSTRAINT "Region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Region" ("code", "countryId", "id", "name") SELECT "code", "countryId", "id", "name" FROM "Region";
DROP TABLE "Region";
ALTER TABLE "new_Region" RENAME TO "Region";
CREATE TABLE "new_Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "code" TEXT NOT NULL
);
INSERT INTO "new_Country" ("code", "id", "name") SELECT "code", "id", "name" FROM "Country";
DROP TABLE "Country";
ALTER TABLE "new_Country" RENAME TO "Country";
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
