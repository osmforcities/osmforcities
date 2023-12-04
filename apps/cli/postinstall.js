import fs from "fs-extra";

/**
 * Prisma doesn't handle well when the schema file is not present in the same
 *  sub-tree of package.json. So we copy the schema file from apps/next/prisma
 * to apps/cli/prisma after the installation.
 * See
 *
 * - https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-monorepo
 * - https://github.com/vercel/next.js/issues/46070
 * - https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

(async () => {
  // remove prisma folder
  await fs.remove("./prisma");

  // copy prisma folder from apps/next/prisma
  await fs.copy("../web/prisma", "./prisma");
})();
