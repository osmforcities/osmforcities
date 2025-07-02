import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";
import { getUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DatasetSchema, type Dataset } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";

async function getFollowedDatasets(): Promise<Dataset[]> {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return [];
    }

    const watchedDatasets = await prisma.datasetWatch.findMany({
      where: {
        userId: user.id,
      },
      include: {
        dataset: {
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

    return watchedDatasets.map((watch) => {
      const dataset = watch.dataset;
      return DatasetSchema.parse({
        ...dataset,
        geojson: dataset.geojson as FeatureCollection | null,
        bbox: dataset.bbox as number[] | null,
        area: {
          ...dataset.area,
          geojson: dataset.area.geojson as FeatureCollection | null,
        },
        isWatched: true,
        watchersCount: dataset._count.watchers,
      });
    });
  } catch (error) {
    console.error("Error fetching watched datasets:", error);
    return [];
  }
}

export default async function FollowedDatasetsPage() {
  const datasets = await getFollowedDatasets();

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
                Watched Datasets
              </h1>
              <p className="text-muted-foreground mt-2">
                Datasets you're watching to stay updated
              </p>
            </div>

            {datasets.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No watched datasets
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start watching public datasets to see them here
                </p>
                <Button asChild>
                  <Link href="/my-datasets">Browse Datasets</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {datasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {dataset.template.name}
                        </h3>
                        <p className="text-muted-foreground">
                          {dataset.cityName}
                          {dataset.area.countryCode &&
                            ` (${dataset.area.countryCode})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            dataset.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {dataset.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    {dataset.template.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {dataset.template.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Features
                        </p>
                        <p className="text-lg font-semibold">
                          {dataset.dataCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Watchers
                        </p>
                        <p className="text-lg font-semibold">
                          {dataset.watchersCount?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground capitalize">
                        {dataset.template.category}
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dataset/${dataset.id}`}>
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
