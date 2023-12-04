// check if .env file exists, if not, create it
// and set default values
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "./.env");

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    `POSTGRES_PRISMA_URL=\"postgres://postgres:docker@localhost:5433/postgres\"\n`
  );
}

function removeSymlinkIfItExists(filePath) {
  try {
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      console.log(`Removing existing .env symlink at ${filePath}`);
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error; // Rethrow if the error is not related to the absence of the file
    }
  }
}

// Create symlinks to .env file in all apps
const apps = ["cli", "web"];
apps.forEach((app) => {
  const appEnvPath = path.join(__dirname, `./apps/${app}/.env`);
  removeSymlinkIfItExists(appEnvPath);
  console.log(`Creating .env symlink for ${app} app.`);
  fs.symlinkSync(envPath, appEnvPath);
});
