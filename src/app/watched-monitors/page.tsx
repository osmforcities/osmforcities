import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { getUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MonitorSchema, type Monitor } from "@/schemas/monitor";
import type { FeatureCollection } from "geojson";

async function getFollowedMonitors(): Promise<Monitor[]> {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return [];
    }

    const watchedMonitors = await prisma.monitorWatch.findMany({
      where: {
        userId: user.id,
      },
      include: {
        monitor: {
          include: {
            template: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            area: true,
            _count: {
              select: { watchers: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return watchedMonitors.map((watch) => {
      const monitor = watch.monitor;
      return MonitorSchema.parse({
        ...monitor,
        geojson: monitor.geojson as FeatureCollection | null,
        bbox: monitor.bbox as number[] | null,
        area: {
          ...monitor.area,
          geojson: monitor.area.geojson as FeatureCollection | null,
        },
        isWatched: true,
        watchersCount: monitor._count.watchers,
      });
    });
  } catch (error) {
    console.error("Error fetching watched monitors:", error);
    return [];
  }
}

export default async function FollowedMonitorsPage() {
  const monitors = await getFollowedMonitors();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Eye className="h-8 w-8 text-blue-500" />
                Watched Monitors
              </h1>
              <p className="text-muted-foreground mt-2">
                Monitors you're watching to stay updated
              </p>
            </div>

            {monitors.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No watched monitors
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start watching public monitors to see them here
                </p>
                <Button asChild>
                  <Link href="/my-monitors">Browse Monitors</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {monitors.map((monitor) => (
                  <div
                    key={monitor.id}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {monitor.template.name}
                        </h3>
                        <p className="text-muted-foreground">
                          {monitor.cityName}
                          {monitor.area.countryCode &&
                            ` (${monitor.area.countryCode})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            monitor.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {monitor.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    {monitor.template.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {monitor.template.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Features
                        </p>
                        <p className="text-lg font-semibold">
                          {monitor.dataCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Watchers
                        </p>
                        <p className="text-lg font-semibold">
                          {monitor.watchersCount?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground capitalize">
                        {monitor.template.category}
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/monitor/${monitor.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
