import { Knex } from "knex";

/**
 *
 * Create countries, regions and cities tables. We use both auto-incrementing
 * integer ids and string codes for each entity. At the moment, we don't know
 * which approach is better, so we use both. We can always drop one of them
 * later.
 *
 */
export async function up(knex: Knex): Promise<void> {
  // Create countries table
  await knex.schema.createTable("countries", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("code").notNullable().unique();
  });

  // Create regions table
  await knex.schema.createTable("regions", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("code").notNullable();

    // Relation
    table.integer("country_id").unsigned();
    table.foreign("country_id").references("countries.id");
  });

  // Create cities table
  await knex.schema.createTable("cities", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("name_normalized").notNullable();
    table.string("name_slug").notNullable();
    table.boolean("is_capital").defaultTo(false);

    // Relations
    table.integer("region_id").unsigned();
    table.foreign("region_id").references("regions.id");
    table.string("country_code");
    table.string("region_code").notNullable();
    table.unique(["name_slug", "region_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("cities");
  await knex.schema.dropTable("regions");
  await knex.schema.dropTable("countries");
}
