import fs, { ensureDir } from "fs-extra";
import * as path from "path";
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  parseISO,
  subDays,
} from "date-fns";
import { logger, time, timeEnd } from "./helpers/logger.js";
import {
  PRESETS_HISTORY_META_JSON,
  PRESETS_HISTORY_PBF_FILE,
  TMP_DIR,
} from "../config/index.js";
import exec from "./helpers/exec.js";
import { curlDownload } from "./helpers/curl-download.js";
import execa from "execa";

const TMP_HISTORY_DIR = path.join(TMP_DIR, "history");

// This is the date of first daily changefile available on OpenStreetMap
const fistDailyChangefileTimestamp = parseISO("2012-09-12T23:59:59.999Z");

export async function updatePresetsHistoryMetafile(extraMeta = {}) {
  logger.info("Updating history file timestamp in meta JSON file...");

  let historyMeta = {};

  // Load meta JSON file if it exists
  if (await fs.pathExists(PRESETS_HISTORY_META_JSON)) {
    historyMeta = await fs.readJson(PRESETS_HISTORY_META_JSON);
  }

  time("Duration of timestamp update");

  // Extract metadata from history file
  const { stdout: firstTimestamp } = await exec("osmium", [
    "fileinfo",
    "-e",
    "-g",
    "data.timestamp.first",
    PRESETS_HISTORY_PBF_FILE,
  ]);

  const { stdout: lastTimestamp } = await exec("osmium", [
    "fileinfo",
    "-e",
    "-g",
    "data.timestamp.last",
    PRESETS_HISTORY_PBF_FILE,
  ]);

  // Write timestamp to meta JSON file
  await fs.writeJSON(
    PRESETS_HISTORY_META_JSON,
    {
      ...historyMeta,
      elements: {
        firstTimestamp,
        lastTimestamp,
      },
      ...extraMeta,
    },
    { spaces: 2 }
  );

  timeEnd("Duration of timestamp update");
}

export async function updatePresetsHistory(options) {
  // Create tmp dir for history files
  await ensureDir(TMP_HISTORY_DIR);

  time("Daily update total duration");
  if (!(await fs.pathExists(PRESETS_HISTORY_PBF_FILE))) {
    throw `Latest history file not found.`;
  }

  // Get timestamp from history file and update meta
  if (!(await fs.pathExists(PRESETS_HISTORY_META_JSON))) {
    await updatePresetsHistoryMetafile();
  }

  const historyFileMeta = await fs.readJSON(PRESETS_HISTORY_META_JSON);

  let lastDailyUpdate = endOfDay(
    parseISO(`${historyFileMeta.elements.lastTimestamp.slice(0, 10)}Z`)
  );

  const historyFileAgeInDays = differenceInCalendarDays(
    Date.now(),
    lastDailyUpdate
  );

  if (historyFileAgeInDays <= 1) {
    logger.info("History file is updated.");
    return;
  }

  // Check if history file is older than the fist daily changefile
  if (lastDailyUpdate.getTime() < fistDailyChangefileTimestamp.getTime()) {
    logger.info(
      `History file is older than ${fistDailyChangefileTimestamp.toISOString()}, applying the first daily diff available.`
    );

    // Pretend the history file timestamp is from the day before the fist daily changefile
    lastDailyUpdate = subDays(fistDailyChangefileTimestamp, 1);
  }

  const nextDay = addDays(lastDailyUpdate, 1);

  // Calculate next day sequence number from current timestamp
  const nextDayChangeFileNumber = (
    differenceInCalendarDays(nextDay, fistDailyChangefileTimestamp) + 1
  )
    .toString()
    .padStart(9, "0");

  const dailyChangeFile = path.join(
    TMP_HISTORY_DIR,
    `${nextDayChangeFileNumber}.osc.gz`
  );

  logger.info(`Downloading day changefile ${nextDayChangeFileNumber}...`);

  // Download daily changefile
  try {
    time("Duration of daily changefile download");
    await curlDownload(
      `https://planet.osm.org/replication/day/${nextDayChangeFileNumber.slice(
        0,
        3
      )}/${nextDayChangeFileNumber.slice(3, 6)}/${nextDayChangeFileNumber.slice(
        6
      )}.osc.gz`,
      dailyChangeFile
    );
    timeEnd("Duration of daily changefile download");
  } catch (error) {
    logger.info("Changefile is not available.");
    return;
  }

  const UPDATED_PRESETS_HISTORY_FILE = path.join(
    TMP_HISTORY_DIR,
    "presets-history.osh.pbf"
  );

  logger.info(`Applying changes...`);
  time("Duration of daily change apply operation");
  await execa("osmium", [
    "apply-changes",
    "--overwrite",
    PRESETS_HISTORY_PBF_FILE,
    dailyChangeFile,
    `--output=${UPDATED_PRESETS_HISTORY_FILE}`,
  ]);
  timeEnd("Duration of daily change apply operation");

  logger.info(`Replacing current file...`);
  await fs.move(UPDATED_PRESETS_HISTORY_FILE, PRESETS_HISTORY_PBF_FILE, {
    overwrite: true,
  });

  await updatePresetsHistoryMetafile();
  logger.info(`Finished!`);

  await fs.remove(dailyChangeFile);

  timeEnd("Daily update total duration");

  if (options && options.recursive) {
    logger.info("Replicating history file...");
    await updatePresetsHistory(options);
  }
}
