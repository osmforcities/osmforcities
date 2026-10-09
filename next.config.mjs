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
  // The Playwright tiler server runs a second `next dev`, which cannot share .next
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
