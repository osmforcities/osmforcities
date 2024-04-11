import * as path from "path";
import fs from "fs-extra";
import { ensureDir } from "fs-extra";

// Helpers
import { logger } from "../../../helpers/logger.js";
import { curlDownload } from "../../../helpers/curl-download.js";
import { unzip } from "../../../helpers/unzip.js";

// Context Config
import { CLI_TMP_DIR, POLYFILES_DIR, POLYFILES_URL } from "../config.js";

export const setup = async () => {
  // Initialize directories required by the CLI app
  await ensureDir(CLI_TMP_DIR);
  await ensureDir(POLYFILES_DIR);

  // Download boundary polygons
  try {
    const POLYFILES_TMP_FILE = path.join(CLI_TMP_DIR, "polyfiles.zip");
    await fs.remove(POLYFILES_TMP_FILE);
    await curlDownload(POLYFILES_URL, POLYFILES_TMP_FILE);
    await unzip(POLYFILES_TMP_FILE, POLYFILES_DIR);
  } catch (error) {
    logger.error("Could not download boundary polygons.");
    return;
  }
};

export default setup;
