import * as path from "path";
import fs from "fs-extra";
import { ensureDir } from "fs-extra";

// Helpers
import { logger } from "../../../helpers/logger.js";
import { curlDownload } from "../../../helpers/curl-download.js";
import { unzip } from "../../../helpers/unzip.js";
import GiteaClient from "../../../helpers/gitea-client.js";

// Context Config
import {
  CLI_TMP_DIR,
  GIT_ORGANIZATION,
  GIT_REPOSITORY_NAME,
  POLYFILES_DIR,
  POLYFILES_URL,
} from "../config.js";

// Create Gitea client
const giteaClient = new GiteaClient();

export async function initRemoteGit() {
  // Initialize repository in Gitea
  try {
    const { status: repoStatus } = await giteaClient.get(
      `repos/${GIT_ORGANIZATION}/${GIT_REPOSITORY_NAME}`
    );
    // Get repository status
    if (repoStatus === 404) {
      const repositoryCreationResponse = await giteaClient.post(
        `orgs/${GIT_ORGANIZATION}/repos`,
        {
          name: GIT_REPOSITORY_NAME,
          private: false,
        }
      );

      if (repositoryCreationResponse.status !== 201) {
        throw "Could not create repository.";
      }
    } else {
      logger.info(
        `Repository '${GIT_ORGANIZATION}/${GIT_REPOSITORY_NAME}' exists.`
      );
    }
  } catch (error) {
    logger.error(error);
    return;
  }
}

export const setup = async () => {
  // Initialize directories required by the CLI app
  await ensureDir(CLI_TMP_DIR);
  await ensureDir(POLYFILES_DIR);

  // Initialize organization in Gitea
  try {
    const { status: orgStatus } = await giteaClient.get(
      `orgs/${GIT_ORGANIZATION}`
    );

    if (orgStatus === 404) {
      // Create organization if it does not exist
      const { status: orgCreationStatus } = await giteaClient.post("orgs", {
        username: GIT_ORGANIZATION,
        visibility: "public",
      });

      if (orgCreationStatus !== 201) {
        throw "Could not create organization.";
      }
    } else {
      logger.info(`Organization '${GIT_ORGANIZATION}' exists.`);
    }
  } catch (error) {
    logger.error(error);
    return;
  }

  await initRemoteGit();

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
