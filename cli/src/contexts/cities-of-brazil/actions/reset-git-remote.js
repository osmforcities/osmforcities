import { logger } from "../../../helpers/logger.js";
import GiteaClient from "../../../helpers/gitea-client.js";

// Context config
import { GIT_ORGANIZATION, GIT_REPOSITORY_NAME } from "../config.js";
import { initRemoteGit } from "./setup.js";

// Create Gitea client
const giteaClient = new GiteaClient();

export const resetRemoteGit = async () => {
  // Remove repository by gitea
  try {
    const { status } = await giteaClient.delete(
      `repos/${GIT_ORGANIZATION}/${GIT_REPOSITORY_NAME}`
    );

    switch (status) {
      case 204:
        await initRemoteGit();
        logger.info(`Remote git repository was reset.`);
        break;

      case 404:
        logger.error(
          `Remote git repository was not found, is your Gitea token correct?`
        );
        break;

      default:
        logger.error(
          `Unexpected ${status} status while deleting remote git repository.`
        );
        break;
    }
  } catch (error) {
    logger.error(error);
    return;
  }
};

export default resetRemoteGit;
