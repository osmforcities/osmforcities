import exec from "./helpers/exec.js";
import {
  TMP_DIR,
  HISTORY_PBF_PATH,
  CONFIG_PATH,
  PRESETS_HISTORY_PBF_FILE,
  PRESETS_HISTORY_META_JSON,
} from "../config/index.js";
import { ensureDir, remove } from "fs-extra";
import * as path from "path";
import { curlDownload } from "./helpers/curl-download.js";
import { updatePresetsHistoryMetafile } from "./update-presets-history.js";
import { logger } from "./helpers/logger.js";

// Local constants

const FULL_HISTORY_TMP_FILE = path.join(TMP_DIR, `history-latest.osh.pbf`);

const PRESET_HISTORY_PBF_TMP_FILE = path.join(
  TMP_DIR,
  "presets-history.osh.pbf"
);

/**
 * Fetches the latest history file and filters it by Osmium tag filters.
 *
 * @param {Object} options Options
 * @param {string} options.local Use local history file
 */
export async function fetchFullHistory({ local }) {
  await ensureDir(TMP_DIR);
  await ensureDir(HISTORY_PBF_PATH);

  // await remove(FULL_HISTORY_TMP_FILE);

  let historyFile;
  if (typeof local === "undefined") {
    // Download latest history file to local volume with curl
    // logger.info("Downloading latest history file...");
    // await curlDownload(FULL_HISTORY_FILE_URL, FULL_HISTORY_TMP_FILE);
    historyFile = FULL_HISTORY_TMP_FILE;
  } else {
    historyFile = local;
  }

  logger.info("Extract the history of the area covered by osmforcities...");

  await exec(`osmium`, [
    `extract`,
    `--with-history`,
    `-p`,
    path.join(CONFIG_PATH, "coverage.poly"),
    historyFile,
    `-o`,
    PRESETS_HISTORY_PBF_FILE,
    `--overwrite`,
  ]);

  // Reset json metafile if exists
  await remove(PRESETS_HISTORY_META_JSON);

  await updatePresetsHistoryMetafile();
}
