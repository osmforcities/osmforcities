-- CreateTable
CREATE TABLE "cities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "is_capital" BOOLEAN DEFAULT false,
    "region_id" INTEGER,
    "country_code" TEXT,
    "region_code" TEXT NOT NULL,
    CONSTRAINT "cities_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "countries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "regions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country_id" INTEGER,
    CONSTRAINT "regions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_slug_region_id_unique" ON "cities"("name_slug", "region_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_unique" ON "countries"("code");
