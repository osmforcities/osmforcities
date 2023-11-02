import winston from "winston";
import "winston-daily-rotate-file";
import fs from "fs-extra";
import { STATS_DIR } from "../../config/index.js";

const { printf } = winston.format;

class CountryStatsCollector {
  constructor(countrySlug, timestamp) {
    this.countrySlug = countrySlug;
    this.timestamp = timestamp;

    // Clear file if exists
    fs.removeSync(`${STATS_DIR}/${this.countrySlug}-${this.timestamp}.log`);

    this.logger = winston.createLogger({
      transports: [
        new winston.transports.File({
          filename: `${this.countrySlug}-${this.timestamp}.log`,
          dirname: STATS_DIR,
          format: printf(({ message }) => {
            const {
              cityId,
              meta: {
                datasetCount,
                datasetCoverage,
                requiredTagsCoverage,
                recommendedTagsCoverage,
              },
            } = message;

            return [
              cityId,
              datasetCount,
              datasetCoverage,
              requiredTagsCoverage,
              recommendedTagsCoverage,
            ].join(",");
          }),
        }),
      ],
    });
  }
}

export default CountryStatsCollector;
