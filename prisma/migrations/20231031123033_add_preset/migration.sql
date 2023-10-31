-- CreateTable
CREATE TABLE "Preset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "osmium_filter" TEXT NOT NULL,
    "required_tags" TEXT NOT NULL,
    "recommended_tags" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Preset_osmium_filter_key" ON "Preset"("osmium_filter");
