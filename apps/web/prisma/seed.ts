import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "..", "..", "data");

async function seed() {
  console.log("Starting data seeding...");

  // Truncate tables
  console.log("Truncating tables...");
  await prisma.$executeRaw`TRUNCATE TABLE "CityStats" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Preset" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "City" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Region" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Country" RESTART IDENTITY CASCADE`;
  console.log("Tables truncated.");

  // Countries
  console.log("Seeding countries...");
  const countriesCsv = fs.readFileSync(
    path.join(DATA_DIR, "countries.csv"),
    "utf8"
  );
  const countries = parse(countriesCsv, {
    columns: true,
    skip_empty_lines: true,
  });
  await prisma.country.createMany({ data: countries });
  console.log("Countries seeded.");

  // Regions
  console.log("Seeding regions...");
  const regionsCsv = fs.readFileSync(
    path.join(DATA_DIR, "regions.csv"),
    "utf8"
  );
  const regions = parse(regionsCsv, { columns: true, skip_empty_lines: true });
  const countryMap = await prisma.country
    .findMany()
    .then((countries) => new Map(countries.map((c) => [c.code, c.id])));
  const regionData = regions
    .map((region: any) => ({
      countryId: countryMap.get(region.country_code),
      name: region.name,
      name_slug: region.name_slug,
      code: region.code,
    }))
    .filter((region: any) => region.countryId);
  await prisma.region.createMany({ data: regionData });
  console.log("Regions seeded.");

  // Cities
  console.log("Seeding cities...");
  const citiesCsv = fs.readFileSync(path.join(DATA_DIR, "cities.csv"), "utf8");
  const cities = parse(citiesCsv, { columns: true, skip_empty_lines: true });
  const regionMap = await prisma.region
    .findMany()
    .then((regions) => new Map(regions.map((r) => [r.code, r.id])));
  const cityData = cities
    .map((city: any) => ({
      regionId: regionMap.get(city.region_code),
      name_slug: city.name_slug,
      name: city.name,
      name_normalized: city.name_normalized.toLowerCase(),
      is_capital: city.is_capital !== "",
      metadata: city,
    }))
    .filter((city: any) => city.regionId);
  await prisma.city.createMany({ data: cityData });
  console.log("Cities seeded.");

  // Presets
  console.log("Seeding presets...");
  const presetsCsv = fs.readFileSync(
    path.join(DATA_DIR, "presets.csv"),
    "utf8"
  );
  const presets = parse(presetsCsv, { columns: true, skip_empty_lines: true });
  const presetData = presets.map((preset: any) => ({
    ...preset,
    osmium_filter:
      preset.osmium_filter.length > 0 ? preset.osmium_filter.split(",") : [],
    required_tags:
      preset.required_tags.length > 0 ? preset.required_tags.split(",") : [],
    recommended_tags:
      preset.recommended_tags.length > 0
        ? preset.recommended_tags.split(",")
        : [],
  }));
  await prisma.preset.createMany({ data: presetData });
  console.log("Presets seeded.");

  console.log("Data seeding completed.");
}

seed()
  .catch((e) => {
    console.error("An error occurred during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Disconnected from the database.");
  });
