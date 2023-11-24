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

// Create symlinks to .env file in all packages
const packages = ["cli", "web"];
packages.forEach((pkg) => {
  const pkgPath = path.join(__dirname, `./apps/${pkg}/.env`);
  if (!fs.existsSync(pkgPath)) {
    fs.symlinkSync(envPath, pkgPath);
  }
});
