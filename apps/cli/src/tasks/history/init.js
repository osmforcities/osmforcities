import exec from "../../helpers/exec.js";
import fs from "fs-extra";
import {
  TMP_DIR,
  HISTORY_PBF_PATH,
  CONFIG_PATH,
  HISTORY_PBF_FILE,
  HISTORY_META_JSON,
  FULL_HISTORY_FILE_URL,
} from "../../../config/index.js";
import { ensureDir, remove } from "fs-extra";
import * as path from "path";
import { curlDownload } from "../../helpers/curl-download.js";
import { updateHistoryMetafile } from "./update.js";
import { logger } from "../../helpers/logger.js";
import S3Handler from "../../helpers/s3-handler.js";

// Local constants

const FULL_HISTORY_TMP_FILE = path.join(TMP_DIR, `history-latest.osh.pbf`);

/**
 * Fetches the latest history file and filters it by Osmium tag filters.
 *
 * @param {Object} options Options
 * @param {string} options.local Use local history file
 */
export async function initHistory(options) {
  await ensureDir(TMP_DIR);
  await ensureDir(HISTORY_PBF_PATH);

  const historyExists = await fs.pathExists(HISTORY_PBF_FILE);

  if (historyExists && !options.overwrite) {
    logger.info(
      `History file already exists at ${HISTORY_PBF_FILE}. Use -O to overwrite.`
    );
    return;
  }

  let historyFile;
  if (typeof options.local === "undefined") {
    logger.info("Downloading latest history file...");
    await remove(FULL_HISTORY_TMP_FILE);
    await curlDownload(FULL_HISTORY_FILE_URL, FULL_HISTORY_TMP_FILE);
    historyFile = FULL_HISTORY_TMP_FILE;
  } else {
    historyFile = options.local;
  }

  logger.info("Extract the history of the area covered by osmforcities...");

  await exec(`osmium`, [
    `extract`,
    `--with-history`,
    `-p`,
    path.join(CONFIG_PATH, "coverage.poly"),
    historyFile,
    `-o`,
    HISTORY_PBF_FILE,
    `--overwrite`,
  ]);

  // Reset json metafile if exists
  await remove(HISTORY_META_JSON);

  await updateHistoryMetafile();

  if (options.s3) {
    logger.info("Uploading history file to S3...");
    const s3 = new S3Handler();
    await s3.upload(HISTORY_PBF_FILE, "history.osh.pbf");
    await s3.upload(HISTORY_META_JSON, "history.osh.pbf.json");
  }
}
