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

// Create symlinks to .env file in all apps
const apps = ["cli", "web"];
apps.forEach((app) => {
  const appPath = path.join(__dirname, `./apps/${app}/.env`);
  try {
    const stats = fs.lstatSync(appPath);
    if (!stats.isSymbolicLink()) {
      console.log(`Creating .env symlink for ${app} app.`);
      fs.symlinkSync(envPath, appPath);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`Creating .env symlink for ${app} app.`);
      fs.symlinkSync(envPath, appPath);
    } else {
      throw error; // Rethrow if the error is not related to the absence of the file
    }
  }
});
