import exec from "./helpers/exec.js";
import {
  TMP_DIR,
  HISTORY_PBF_PATH,
  FULL_HISTORY_FILE_URL,
  getPresets,
  PRESETS_HISTORY_PBF_FILE,
  PRESETS_HISTORY_META_JSON,
} from "../config/index.js";
import { ensureDir, remove } from "fs-extra";
import * as path from "path";
import { curlDownload } from "./helpers/curl-download.js";
import { updatePresetsHistoryMetafile } from "./update-presets-history.js";
import { logger } from "./helpers/logger.js";

import osmium from "./helpers/osmium.js";

// Local constants

const FULL_HISTORY_TMP_FILE = path.join(TMP_DIR, `history-latest.osh.pbf`);

const PRESET_HISTORY_PBF_TMP_FILE = path.join(
  TMP_DIR,
  "presets-history.osh.pbf"
);

/**
 * Refreshes the presets history PBF file. This task will download the latest
 * history file, filter using Osmium tag filters from configuration files, and
 * then save it to the preset history PBF file.
 */
export async function fetchFullHistory() {
  await ensureDir(TMP_DIR);
  await ensureDir(HISTORY_PBF_PATH);

  await remove(FULL_HISTORY_TMP_FILE);

  // Download latest history file to local volume with curl
  logger.info("Downloading latest history file...");
  await curlDownload(FULL_HISTORY_FILE_URL, FULL_HISTORY_TMP_FILE);

  const presets = await getPresets();
  const osmiumFilters = presets.map((p) => p.osmium_filter);

  logger.info("Filtering presets from history file...");
  await osmium.tagsFilter(
    FULL_HISTORY_TMP_FILE,
    osmiumFilters,
    PRESET_HISTORY_PBF_TMP_FILE
  );

  logger.info("Moving history file to presets directory...");
  await exec("mv", [PRESET_HISTORY_PBF_TMP_FILE, PRESETS_HISTORY_PBF_FILE]);

  await remove(PRESETS_HISTORY_META_JSON);

  await updatePresetsHistoryMetafile();
}
