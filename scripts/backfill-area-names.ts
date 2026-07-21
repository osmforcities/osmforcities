/**
 * Backfill localized area names (Area.names) for existing areas.
 *
 * Re-runs the app's own refreshAreaInfo for every stored area, which captures
 * the OSM name:* translations from Overpass + Nominatim. Bypasses the 30-day
 * AREA_INFO_TTL so names populate immediately. Uses the app's ORM path — no
 * raw SQL.
 *
 * Requires the Overpass tunnel to be up locally:
 *   cd infra/ansible && ./scripts/overpass-tunnel.sh start
 *
 * Run: pnpm tsx scripts/backfill-area-names.ts
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  // Import after env is loaded so the Prisma client picks up DATABASE_URL.
  const { prisma } = await import("@/lib/db");
  const { refreshAreaInfo } = await import("@/lib/area-refresh");

  const areas = await prisma.area.findMany({
    select: { id: true, bounds: true },
    orderBy: { id: "asc" },
  });

  console.log(`Backfilling names for ${areas.length} area(s)...`);
  let refreshed = 0;
  let failed = 0;

  for (const area of areas) {
    try {
      await refreshAreaInfo(area.id, area.bounds);
      refreshed++;
      console.log(`  [${refreshed + failed}/${areas.length}] area ${area.id} ✓`);
    } catch (error) {
      failed++;
      console.error(`  [${refreshed + failed}/${areas.length}] area ${area.id} ✗`, error);
    }
  }

  console.log(`Done. ${refreshed} refreshed, ${failed} failed.`);
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
