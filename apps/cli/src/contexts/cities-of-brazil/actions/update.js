import * as path from "path";
import fs, { ensureDir } from "fs-extra";
import cliProgress from "cli-progress";
import readline from "readline";
import { PrismaClient } from "@prisma/client";
import S3Handler from "../../../helpers/s3-handler.js";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import {
  addDays,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import simpleGit from "simple-git";
import pLimit from "p-limit";
import execa from "execa";

// Helpers
import { logger } from "../../../helpers/logger.js";
import {
  extractPoly,
  tagsFilter,
  timeFilter,
} from "../../../helpers/osmium.js";
import { average } from "../../../helpers/math.js";

import pbfIsEmpty from "../../../helpers/pbf-is-empty.js";

// CLI config
import {
  GIT_USER,
  GIT_EMAIL,
  GIT_HISTORY_START_DATE,
  HISTORY_PBF_FILE,
  HISTORY_META_JSON,
  HISTORY_PBF_PATH,
} from "../../../../config/index.js";

// Context config
import {
  CLI_GIT_DIR,
  CURRENT_DAY_COUNTRY_FILE,
  CURRENT_DAY_DIR,
  CURRENT_DAY_FILE,
  CURRENT_DAY_ALL_TAGS_FILE,
  CURRENT_DAY_LEVEL_1_DIR,
  CURRENT_DAY_LEVEL_2_DIR,
  CURRENT_DAY_LEVEL_3_DIR,
  CURRENT_DAY_PRESETS_DIR,
  GIT_REPOSITORY_URL,
  POLYFILES_LEVEL_0_DIR,
  POLYFILES_LEVEL_1_DIR,
  POLYFILES_LEVEL_2_DIR,
  POLYFILES_LEVEL_3_DIR,
} from "../config.js";
import setupGithubSSHKey from "../../../helpers/setup-ssh-key.js";

const COUNTRY_SLUG = "brazil";
const s3 = new S3Handler();
const prisma = new PrismaClient();

// Set concurrency limit
const limit = pLimit(20);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askConfirmation = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
};

export const update = async (options) => {
  const isSubsequentUpdate = options?.isSubsequentUpdate || false;

  // Download history file from S3 if it doesn't exist and this is not a
  // recursive call
  if (options && options.s3 && !isSubsequentUpdate) {
    const secretsManager = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    logger.info("Retrieving the SSH key from AWS Secrets Manager...");
    const { SecretString: gitSshKey } = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: "GIT_SSH_PRIVATE_KEY",
      })
    );

    await setupGithubSSHKey(gitSshKey);
    logger.info("SSH key setup completed.");

    logger.info("Downloading history file from S3...");
    await ensureDir(HISTORY_PBF_PATH);
    await s3.download("history.osh.pbf", HISTORY_PBF_FILE);
    await s3.download("history.osh.pbf.json", HISTORY_META_JSON);
    logger.info("History file downloaded.");
  }

  try {
    if (options?.overwrite && options?.recursive) {
      throw new Error(
        `Cannot run update with both --overwrite and --recursive options.`
      );
    } else if (options && options.overwrite && options.force !== true) {
      const confirmation =
        (await askConfirmation(
          `Are you sure you want to reset the repository at ${GIT_REPOSITORY_URL}? [y/N]: `
        )) || "n";
      if (confirmation !== "y") {
        logger.info("Reset operation cancelled.");
        return;
      }
    }
  } finally {
    // Close readline interface
    rl.close();
  }

  logger.info("Initializing repository path...");
  await fs.ensureDir(CLI_GIT_DIR);
  await fs.ensureDir(CURRENT_DAY_DIR);

  logger.info("Retrieving presets from database...");
  const presets = await prisma.preset.findMany({
    select: {
      id: true,
      osmium_filter: true,
      name_slug: true,
      required_tags: true,
      recommended_tags: true,
    },
  });

  logger.info("Checking history file and metadata...");
  let firstHistoryTimestamp;
  let lastHistoryTimestamp;
  let defaultStartDate = parseISO(GIT_HISTORY_START_DATE);
  let lastDailyUpdate;

  if (!(await fs.pathExists(HISTORY_PBF_FILE))) {
    throw new Error(
      `Could not find presets history file, please run update-presets-history task.`
    );
  } else if (!(await fs.pathExists(HISTORY_META_JSON))) {
    throw new Error(
      `Could not find metadata for presets history file, please run update-presets-history task.`
    );
  }

  const presetsHistoryMeta = await fs.readJson(HISTORY_META_JSON);
  firstHistoryTimestamp = new Date(presetsHistoryMeta.elements.firstTimestamp);
  lastHistoryTimestamp = new Date(presetsHistoryMeta.elements.lastTimestamp);

  logger.info("Setting up Git...");
  const git = await simpleGit({ baseDir: CLI_GIT_DIR });

  // Reset local git directory
  await fs.emptyDir(CLI_GIT_DIR);
  await git.raw("-c", "init.defaultbranch=main", "init");
  await git.addRemote("origin", `${GIT_REPOSITORY_URL}`);

  logger.info("Checking for latest updates from remote repository...");
  const remoteHeads = await git.listRemote(["--heads", "origin"]);
  if (!options?.overwrite && remoteHeads?.indexOf("main") > -1) {
    await git.pull("origin", "main", "--depth=1");

    lastDailyUpdate = parseISO(
      (await fs.readJSON(path.join(CLI_GIT_DIR, "package.json")))
        .lastDailyUpdate
    );
  } else {
    // If not commits are available, set the last day update to the day before
    // the default start date
    lastDailyUpdate = startOfDay(subDays(defaultStartDate, 1));
  }

  let currentDailyUpdate = addDays(lastDailyUpdate, 1);

  if (isBefore(currentDailyUpdate, startOfDay(firstHistoryTimestamp))) {
    // If the repository was updated before the first history timestamp, use
    // the first history timestamp as start date
    currentDailyUpdate = startOfDay(addDays(firstHistoryTimestamp, 1));
  } else if (isAfter(currentDailyUpdate, lastHistoryTimestamp)) {
    logger.info(
      `The history file doesn't include ${currentDailyUpdate.toISOString()}, nothing to update.`
    );
    return;
  }

  // Get current day timestamp
  const currentDayISO = currentDailyUpdate
    .toISOString()
    .slice(0, 19)
    .concat("Z");

  // Extract OSM data from history file at the current date
  logger.info(`Filtering: ${currentDayISO}`);
  await timeFilter(HISTORY_PBF_FILE, currentDayISO, CURRENT_DAY_ALL_TAGS_FILE);

  // Filter presets from current day file
  logger.info(`Filtering presets from current day file...`);
  await tagsFilter(
    CURRENT_DAY_ALL_TAGS_FILE,
    presets.map((preset) => preset.osmium_filter),
    CURRENT_DAY_FILE
  );

  if (await pbfIsEmpty(CURRENT_DAY_FILE)) {
    logger.info(`No data found, skipping ${currentDayISO}`);
    return;
  }

  logger.info(`Extracting country from current day file...`);
  await extractPoly(
    path.join(POLYFILES_LEVEL_0_DIR, "brazil.poly"),
    CURRENT_DAY_FILE,
    CURRENT_DAY_COUNTRY_FILE
  );

  // Extract level 1 data
  logger.info(`Extracting level 1 data...`);
  await fs.remove(CURRENT_DAY_LEVEL_1_DIR);
  await fs.ensureDir(CURRENT_DAY_LEVEL_1_DIR);

  // Get list of polyfiles at level 1
  const level1Polyfiles = await fs.readdir(POLYFILES_LEVEL_1_DIR);

  // Extract each level 1 polyfile
  for (let i = 0; i < level1Polyfiles.length; i++) {
    const polyfileName = level1Polyfiles[i];
    const level1AreaId = polyfileName.split(".")[0];

    // Restrict updates to Sergipe state when not in production
    if (process.env.NODE_ENV !== "production" && level1AreaId !== "28") {
      continue;
    }

    logger.info(`Extracting level 1 area with id: ${level1AreaId}...`);
    await extractPoly(
      path.join(POLYFILES_LEVEL_1_DIR, polyfileName),
      CURRENT_DAY_COUNTRY_FILE,
      path.join(CURRENT_DAY_LEVEL_1_DIR, `${level1AreaId}.osm.pbf`)
    );
  }

  // Extract level 2 data
  logger.info(`Extracting level 2 data...`);
  await fs.remove(CURRENT_DAY_LEVEL_2_DIR);
  await fs.ensureDir(CURRENT_DAY_LEVEL_2_DIR);

  // Get list of polyfiles at level 2
  const level2Polyfiles = await fs.readdir(POLYFILES_LEVEL_2_DIR);

  // Extract each level 2 polyfile
  for (let i = 0; i < level2Polyfiles.length; i++) {
    const polyfileName = level2Polyfiles[i];

    // Get first two characters of polyfile name
    const level1AreaId = polyfileName.slice(0, 2);
    const level2AreaId = polyfileName.split(".")[0];
    const level1FilePath = path.join(
      CURRENT_DAY_LEVEL_1_DIR,
      `${level1AreaId}.osm.pbf`
    );
    const level2FilePath = path.join(
      CURRENT_DAY_LEVEL_2_DIR,
      `${level2AreaId}.osm.pbf`
    );

    if (await pbfIsEmpty(level1FilePath)) {
      // Bypass if file is empty
      logger.verbose(`No data found for level 1 area with id: ${level1AreaId}`);
    } else {
      // Extract level 2 area
      logger.verbose(`Extracting level 2 area with id: ${level2AreaId}...`);
      await extractPoly(
        path.join(POLYFILES_LEVEL_2_DIR, polyfileName),
        level1FilePath,
        level2FilePath
      );
    }
  }

  // Extract level 3 data
  logger.info(`Extracting level 3 data...`);
  await fs.remove(CURRENT_DAY_LEVEL_3_DIR);
  await fs.ensureDir(CURRENT_DAY_LEVEL_3_DIR);

  // Get list of polyfiles at level 3
  const level3Polyfiles = await fs.readdir(POLYFILES_LEVEL_3_DIR);

  // Map level 3 areas to level 2 areas
  const cities = await prisma.city.findMany({
    include: {
      region: {
        select: {
          code: true,
        },
      },
    },
  });

  const level3ToLevel2 = cities.reduce((acc, city) => {
    const { ibge_microregion_id, ibge_municipality_id } = city.metadata;

    if (!ibge_microregion_id || !ibge_municipality_id) {
      throw new Error(
        `Could not find ibge_microregion_id or ibge_municipality_id for city: ${city.name}`
      );
    }

    acc[ibge_municipality_id] = ibge_microregion_id;
    return acc;
  }, {});

  // Extract each level 3 polyfile
  for (let i = 0; i < level3Polyfiles.length; i++) {
    const polyfileName = level3Polyfiles[i];

    // Get first two characters of polyfile name
    const level3AreaId = polyfileName.split(".")[0];
    const level2AreaId = level3ToLevel2[level3AreaId];
    const level2FilePath = path.join(
      CURRENT_DAY_LEVEL_2_DIR,
      `${level2AreaId}.osm.pbf`
    );
    const level3FilePath = path.join(
      CURRENT_DAY_LEVEL_3_DIR,
      `${level3AreaId}.osm.pbf`
    );

    if (
      !(await fs.pathExists(level2FilePath)) ||
      (await pbfIsEmpty(level2FilePath))
    ) {
      // Bypass if file is empty
      logger.verbose(`No data found for level 2 area with id: ${level2AreaId}`);
    } else {
      logger.verbose(`Extracting level 3 area with id: ${level3AreaId}...`);
      await extractPoly(
        path.join(POLYFILES_LEVEL_3_DIR, polyfileName),
        level2FilePath,
        level3FilePath
      );
    }
  }

  logger.info(`Updating GeoJSON files...`);
  // Clear OSM presets
  await fs.emptyDir(CURRENT_DAY_PRESETS_DIR);

  // Update GeoJSON files
  const geojsonProgressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  const allCityStats = [];
  const cityPresetStats = [];

  geojsonProgressBar.start(cities.length, 0);
  await Promise.all(
    cities.map(async (city) =>
      limit(async () => {
        const {
          name_slug: municipalitySlug,
          region: { code: municipalityUfCode },
          metadata: { ibge_municipality_id: ibgeMunicipalityId },
        } = city;

        const cityStats = {
          presets: [],
        };

        const level3File = path.join(
          CURRENT_DAY_LEVEL_3_DIR,
          `${ibgeMunicipalityId}.osm.pbf`
        );

        // Bypass if municipality is empty
        if (
          !(await fs.pathExists(level3File)) ||
          (await pbfIsEmpty(level3File))
        ) {
          geojsonProgressBar.increment();
          return;
        }

        // Create target geojson path
        const geojsonPath = path.join(
          CLI_GIT_DIR,
          municipalityUfCode,
          municipalitySlug
        );
        await fs.ensureDir(geojsonPath);

        // Extract presets
        await Promise.all(
          presets.map(async (preset) => {
            const presetFile = path.join(
              CURRENT_DAY_PRESETS_DIR,
              `${ibgeMunicipalityId}-${preset.name_slug}.osm.pbf`
            );

            await tagsFilter(level3File, preset.osmium_filter, presetFile);

            if (!(await pbfIsEmpty(presetFile))) {
              const geojsonFile = path.join(
                geojsonPath,
                `${preset.name_slug}.geojson`
              );

              const { stdout: geojsonString } = await execa(
                `./node_modules/.bin/osmtogeojson ${presetFile}`,
                { shell: true }
              );

              const geojson = JSON.parse(geojsonString);

              const totalFeatures = geojson.features.length;
              const totalRequiredTags =
                preset.required_tags.length * totalFeatures;
              const totalRecommendedTags =
                preset.recommended_tags.length * totalFeatures;

              let requiredTags = 0;
              let recommendedTags = 0;
              let updatedAt;
              let changesets = new Set();

              // Write GeoJSON file
              await fs.writeJSON(
                geojsonFile,
                {
                  type: "FeatureCollection",
                  features: geojson.features.map((f) => {
                    // Strip user data
                    // eslint-disable-next-line
                    const { user, uid, ...clearedProperties } = f.properties;

                    // Count required tags
                    preset.required_tags.forEach((t) => {
                      if (clearedProperties[t]) {
                        requiredTags++;
                      }
                    });

                    // Count recommended tags
                    preset.recommended_tags.forEach((t) => {
                      if (clearedProperties[t]) {
                        recommendedTags++;
                      }
                    });

                    // Set updated at
                    const { timestamp } = f.properties;
                    if (timestamp) {
                      if (!updatedAt || timestamp > updatedAt) {
                        updatedAt = timestamp;
                      }
                    }

                    // Set changesets
                    const { changeset } = f.properties;
                    if (changeset) {
                      changesets.add(changeset);
                    }

                    return {
                      ...f,
                      properties: clearedProperties,
                    };
                  }),
                },
                { spaces: 2 }
              );

              const requiredTagsCoverage =
                totalFeatures > 0 && totalRequiredTags > 0
                  ? requiredTags / totalRequiredTags
                  : 1;
              const recommendedTagsCoverage =
                totalFeatures > 0 && totalRecommendedTags > 0
                  ? recommendedTags / totalRecommendedTags
                  : 1;

              cityStats.presets.push({
                requiredTagsCoverage,
                recommendedTagsCoverage,
              });

              cityPresetStats.push({
                cityId: city.id,
                presetId: preset.id,
                updatedAt,
                requiredTagsCoverage,
                recommendedTagsCoverage,
                totalFeatures,
                totalChangesets: changesets.size,
              });
            }
          })
        );

        const presetsCount = cityStats.presets.length;

        allCityStats.push({
          cityId: city.id,
          date: currentDayISO,
          presetsCount,
          requiredTagsCoverage: average(
            cityStats.presets.map((p) => p.requiredTagsCoverage)
          ),
          recommendedTagsCoverage: average(
            cityStats.presets.map((p) => p.recommendedTagsCoverage)
          ),
        });

        geojsonProgressBar.increment();
      })
    )
  );

  geojsonProgressBar.stop();

  logger.info(`Ingesting stats into database...`);

  await prisma.$transaction([
    prisma.cityStats.deleteMany({
      where: {
        date: currentDayISO,
        city: {
          region: {
            country: {
              name_slug: COUNTRY_SLUG,
            },
          },
        },
      },
    }),
    // Only keep the last day of stats for each city
    prisma.cityPresetStats.deleteMany({
      where: {
        cityId: {
          in: cities.map((c) => c.id),
        },
      },
    }),
    prisma.cityStats.createMany({
      data: allCityStats,
    }),
    prisma.cityPresetStats.createMany({
      data: cityPresetStats,
    }),
  ]);

  logger.info(`Updating git repository...`);

  await fs.writeJSON(
    path.join(CLI_GIT_DIR, "package.json"),
    {
      firstHistoryTimestamp,
      lastHistoryTimestamp,
      lastDailyUpdate: currentDayISO,
    },
    { spaces: 2 }
  );

  // Commit
  await git.add(".");
  await git.addConfig("user.name", GIT_USER);
  await git.addConfig("user.email", GIT_EMAIL);
  await git.listConfig();
  await git
    .env({
      GIT_COMMITTER_DATE: currentDayISO,
    })
    .commit(`${currentDayISO}`);

  await git.push("origin", "main", {
    "--set-upstream": null,
    "--force": options?.overwrite,
  });

  // Run update again if it was called recursively
  if (options && options.recursive) {
    update({ ...options, isSubsequentUpdate: true });
  }
};

export default update;
