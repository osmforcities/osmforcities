const { Knex } = require("knex");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const pick = require("lodash.pick");

async function seed(knex) {
  // Deletes ALL existing entries
  await knex("cities").truncate();
  await knex("regions").truncate();
  await knex("countries").truncate();

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

  await knex("countries").insert(countries);

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

  // Link regions with their corresponding country IDs
  for (let region of regions) {
    const country = await knex("countries")
      .select("id")
      .where({ code: region.country_code })
      .first();

    if (country) {
      region.country_id = country.id;
      await knex("regions").insert({
        country_id: region.country_id,
        name: region.name,
        code: region.code,
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

  // Link cities with their corresponding region IDs
  for (let city of cities) {
    const region = await knex("regions")
      .select("id")
      .where({ code: city.region_code })
      .first();

    const country = await knex("countries")
      .select("id")
      .where({ code: city.country_code })
      .first();

    if (country && region) {
      await knex("cities").insert({
        region_id: region.id,
        ...pick(city, [
          "country_code",
          "region_code",
          "name_slug",
          "name",
          "name_normalized",
          "is_capital",
        ]),
      });
    } else {
      throw new Error(`No matching region found for city: ${city.name}`);
    }
  }
}

module.exports = { seed };
