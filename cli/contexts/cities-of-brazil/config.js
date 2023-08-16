import * as path from "path";

// CLI Config
import {
  GITEA_ACCESS_TOKEN,
  GITEA_HOST_URL,
  GITEA_USER,
  CLI_APP_DIR,
  CONTEXTS_DATA_PATH,
  TMP_DIR,
} from "../../../config/index.js";

const CONTEXT_NAME = "cities-of-brazil";

// Target organization and repository
export const GIT_ORGANIZATION = "cities-of";
export const GIT_REPOSITORY_NAME = "brazil";

// Build repository URL
const repositoryUrl = new URL(GITEA_HOST_URL);
repositoryUrl.username = GITEA_USER;
repositoryUrl.password = GITEA_ACCESS_TOKEN;
repositoryUrl.pathname = `/${GIT_ORGANIZATION}/${GIT_REPOSITORY_NAME}.git`;
export const GIT_REPOSITORY_URL = repositoryUrl.toString();

// CLI directories
export const CONTEXT_APP_DIR = path.join(CLI_APP_DIR, "contexts", CONTEXT_NAME);
export const CLI_TMP_DIR = path.join(TMP_DIR, "contexts", CONTEXT_NAME);
const CLI_DATA_DIR = path.join(CONTEXTS_DATA_PATH, CONTEXT_NAME);
export const CLI_GIT_DIR = path.join(CLI_DATA_DIR, "git");

// Polyfiles
export const POLYFILES_URL =
  "https://www.dropbox.com/s/vb9j073ol3ty6ev/polyfiles.zip?dl=0";
export const POLYFILES_DIR = path.join(CLI_DATA_DIR, "polyfiles");
export const POLYFILES_LEVEL_0_DIR = path.join(POLYFILES_DIR);
export const POLYFILES_LEVEL_1_DIR = path.join(POLYFILES_DIR, "ufs");
export const POLYFILES_LEVEL_2_DIR = path.join(POLYFILES_DIR, "microregions");
export const POLYFILES_LEVEL_3_DIR = path.join(POLYFILES_DIR, "municipalities");

// Day extract file
export const CURRENT_DAY_DIR = path.join(CLI_TMP_DIR, "current-day");
export const CURRENT_DAY_FILE = path.join(
  CURRENT_DAY_DIR,
  "current-day.osm.pbf"
);
export const CURRENT_DAY_COUNTRY_FILE = path.join(
  CURRENT_DAY_DIR,
  "current-day-country.osm.pbf"
);
export const CURRENT_DAY_LEVEL_1_DIR = path.join(CURRENT_DAY_DIR, "level-1");
export const CURRENT_DAY_LEVEL_2_DIR = path.join(CURRENT_DAY_DIR, "level-2");
export const CURRENT_DAY_LEVEL_3_DIR = path.join(CURRENT_DAY_DIR, "level-3");
export const CURRENT_DAY_PRESETS_DIR = path.join(CURRENT_DAY_DIR, "presets");
