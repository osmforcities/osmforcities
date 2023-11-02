import winston from "winston";
import "winston-daily-rotate-file";
import fs from "fs-extra";
import { STATS_DIR } from "../../config/index.js";

const { printf } = winston.format;

export const countryStatsCollector = (countrySlug) =>
  winston.createLogger({
    transports: [
      new winston.transports.DailyRotateFile({
        filename: `${countrySlug}-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "1d",
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

export async function resetDailyStatsFile(countrySlug, timestamp) {
  await fs.remove(`${STATS_DIR}/${countrySlug}-${timestamp}.log`);
}
