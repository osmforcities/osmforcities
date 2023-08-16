import fs from "fs-extra";
import { CLI_GIT_DIR } from "../config.js";
import { logger } from "../../../helpers/logger.js";

// Reset local git repository
export const resetLocalGit = async () => {
  if (await fs.pathExists(CLI_GIT_DIR)) {
    await fs.remove(CLI_GIT_DIR);
    logger.info(`Local git repository at ${CLI_GIT_DIR} was removed.`);
  } else {
    logger.info(`Local git repository is not initialized, nothing to reset.`);
  }
};

export default resetLocalGit;
