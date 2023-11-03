import * as csv from "@fast-csv/parse";

export default async function loadCsv(path, options = { headers: true }) {
  const rows = [];
  return new Promise((resolve, reject) => {
    csv
      .parseFile(path, options)
      .on("error", (error) => reject(error))
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}
