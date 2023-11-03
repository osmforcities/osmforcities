import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_DIR = path.join(process.cwd(), "..", "..", "data");

async function seed() {
  // Deletes ALL existing entries
  await prisma.cityStats.deleteMany();
  await prisma.preset.deleteMany();
  await prisma.city.deleteMany();
  await prisma.region.deleteMany();
  await prisma.country.deleteMany();

  /**
   * Countries
   */
  const countriesCsv = fs.readFileSync(
    path.join(DATA_DIR, "countries.csv"),
    "utf8"
  );

  const countries = parse(countriesCsv, {
    columns: true,
    skip_empty_lines: true,
  });

  for (let country of countries) {
    await prisma.country.create({ data: country });
  }

  /**
   * Regions
   */
  const regionsCsv = fs.readFileSync(
    path.join(DATA_DIR, "regions.csv"),
    "utf8"
  );

  const regions = parse(regionsCsv, {
    columns: true,
    skip_empty_lines: true,
  });

  for (let region of regions) {
    const country = await prisma.country.findFirst({
      where: { code: region.country_code },
    });

    if (country) {
      await prisma.region.create({
        data: {
          countryId: country.id,
          name: region.name,
          name_slug: region.name_slug,
          code: region.code,
        },
      });
    } else {
      throw new Error(`No matching country found for region: ${region.name}`);
    }
  }

  /**
   * Cities
   */
  const citiesCsv = fs.readFileSync(path.join(DATA_DIR, "cities.csv"), "utf8");

  const cities = parse(citiesCsv, {
    columns: true,
    skip_empty_lines: true,
  });

  for (let city of cities) {
    const region = await prisma.region.findFirst({
      where: { code: city.region_code },
    });

    city.is_capital = city.is_capital !== "";

    const { name_slug, name, name_normalized, is_capital, ...metadata } = city;

    if (region) {
      await prisma.city.create({
        data: {
          regionId: region.id,
          name_slug,
          name,
          name_normalized,
          is_capital,
          metadata,
        },
      });
    } else {
      throw new Error(`No matching region found for city: ${city.name}`);
    }
  }

  /**
   * Presets
   */

  const presetsCsv = fs.readFileSync(
    path.join(DATA_DIR, "presets.csv"),
    "utf8"
  );

  const presets = parse(presetsCsv, {
    columns: true,
    skip_empty_lines: true,
  });

  for (let preset of presets) {
    await prisma.preset.create({
      data: {
        ...preset,
        osmium_filter:
          preset.osmium_filter.length > 0
            ? preset.osmium_filter.split(",")
            : [],
        required_tags:
          preset.required_tags.length > 0
            ? preset.required_tags.split(",")
            : [],
        recommended_tags:
          preset.recommended_tags.length > 0
            ? preset.recommended_tags.split(",")
            : [],
      },
    });
  }
}

seed()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
