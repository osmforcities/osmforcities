-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "is_capital" BOOLEAN DEFAULT false,
    "regionId" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityStats" (
    "cityId" INTEGER NOT NULL,
    "presetsCount" INTEGER NOT NULL,
    "requiredTagsCoverage" DOUBLE PRECISION NOT NULL,
    "recommendedTagsCoverage" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL
);

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "osmium_filter" TEXT[],
    "required_tags" TEXT[],
    "recommended_tags" TEXT[],

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityPresetStats" (
    "presetId" INTEGER NOT NULL,
    "cityId" INTEGER NOT NULL,
    "totalFeatures" INTEGER NOT NULL,
    "totalChangesets" INTEGER NOT NULL,
    "requiredTagsCoverage" DOUBLE PRECISION NOT NULL,
    "recommendedTagsCoverage" DOUBLE PRECISION NOT NULL,
    "updatedAt" DATE NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CityStats_cityId_date_key" ON "CityStats"("cityId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CityPresetStats_presetId_cityId_updatedAt_key" ON "CityPresetStats"("presetId", "cityId", "updatedAt");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityStats" ADD CONSTRAINT "CityStats_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityPresetStats" ADD CONSTRAINT "CityPresetStats_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "Preset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityPresetStats" ADD CONSTRAINT "CityPresetStats_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
