import { readFileSync } from "fs";
import { City } from "../types/global";
import path from "path";

const citiesCsvPath = path.join(process.cwd(), "public", "cities.csv");

const normalizeInput = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default class DbAdapter {
  private cities: City[];

  constructor() {
    this.cities = [];
  }

  connect = async () => {
    const csvData = readFileSync(citiesCsvPath, "utf8");
    const rows = csvData.split("\n").slice(1); // Skip header row
    const parsedCities = rows.map((row: string) => {
      const columns = row.split(",");
      return {
        name: columns[3],
        state: columns[2],
        normalized: columns[14].toLocaleLowerCase(),
        slug: columns[15],
        isCapital: columns[10] === "true",
      } as City;
    });
    this.cities = parsedCities;
  };

  search = async (query: string) => {
    const normalizedQuery = normalizeInput(query.toLowerCase());
    const results = this.cities.filter((city) => {
      return city.normalized.includes(normalizedQuery);
    });

    // sort by isCapital, then by name
    results.sort((a, b) => {
      if (a.isCapital && !b.isCapital) {
        return -1;
      } else if (!a.isCapital && b.isCapital) {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    // limit to 10 results
    results.splice(10);

    return results;
  };
}
