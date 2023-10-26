const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");
const pick = require("lodash.pick");

const prisma = new PrismaClient();

async function seed() {
  // Deletes ALL existing entries
  await prisma.city.deleteMany();
  await prisma.region.deleteMany();
  await prisma.country.deleteMany();

  /**
   * Countries
   */
  const countriesCsv = fs.readFileSync(
    path.join("..", "data", "countries.csv"),
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
    path.join("..", "data", "regions.csv"),
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
  const citiesCsv = fs.readFileSync(
    path.join("..", "data", "cities.csv"),
    "utf8"
  );

  const cities = parse(citiesCsv, {
    columns: true,
    skip_empty_lines: true,
  });

  for (let city of cities) {
    const region = await prisma.region.findFirst({
      where: { code: city.region_code },
    });

    city.is_capital = city.is_capital !== "";

    if (region) {
      await prisma.city.create({
        data: {
          regionId: region.id,
          ...pick(city, ["name_slug", "name", "name_normalized", "is_capital"]),
        },
      });
    } else {
      throw new Error(`No matching region found for city: ${city.name}`);
    }
  }
}

seed()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
