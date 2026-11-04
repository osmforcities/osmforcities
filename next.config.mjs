import path from "path";
import { fileURLToPath } from "url";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commitHash =
  [
    process.env.COMMIT_HASH,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.GITHUB_SHA,
  ].find((value) => value && value !== "undefined") ?? "unknown";

const nextConfig = {
  outputFileTracingRoot: __dirname,
  // Set by the Playwright tiler server (a second `next dev` cannot share .next)
  // and by deploys, which build into .next-build while the live server keeps .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  env: {
    COMMIT_HASH: commitHash,
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./messages/en.json",
  },
});

export default withNextIntl(nextConfig);
