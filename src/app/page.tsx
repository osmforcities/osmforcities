import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Eye, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OSM for Cities - Monitor OpenStreetMap Datasets",
  description:
    "Track changes in OpenStreetMap datasets across cities worldwide.",
};

async function getUserDatasets(userId: string) {
  const [createdDatasets, watchedDatasets] = await Promise.all([
    prisma.dataset.findMany({
      where: { userId },
      include: {
        template: true,
        area: true,
        _count: {
          select: { watchers: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.datasetWatch.findMany({
      where: { userId },
      include: {
        dataset: {
          include: {
            template: true,
            area: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: { watchers: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return { createdDatasets, watchedDatasets };
}

export default async function Home() {
  const user = await getUserFromCookie();

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-full max-w-2xl text-center p-4 space-y-8">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-4">
            OSM for Cities
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Track and follow OpenStreetMap updates in places you care about.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/about">Learn More</Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/enter">Enter</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { createdDatasets, watchedDatasets } = await getUserDatasets(user.id);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white">
                Welcome back
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Here are your datasets and datasets you're following
              </p>
            </div>
            <Button asChild>
              <Link
                href="/my-datasets/create"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Dataset
              </Link>
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Created Datasets */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Your Datasets
                </h2>
                {createdDatasets.length > 0 && (
                  <span className="text-sm text-gray-500">
                    ({createdDatasets.length})
                  </span>
                )}
              </div>

              {createdDatasets.length === 0 ? (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You haven't created any datasets yet.
                  </p>
                  <Button asChild>
                    <Link href="/my-datasets/create">
                      Create Your First Dataset
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {createdDatasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-black dark:text-white">
                            {dataset.template.name} in {dataset.cityName}
                            {dataset.area.countryCode &&
                              ` (${dataset.area.countryCode})`}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {dataset.template.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              dataset.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {dataset.isActive ? "Active" : "Inactive"}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              dataset.isPublic
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {dataset.isPublic ? "Public" : "Private"}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>Data count: {dataset.dataCount}</span>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dataset/${dataset.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {createdDatasets.length >= 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/my-datasets">View All</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Watched Datasets */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-blue-500" />
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  Following
                </h2>
                {watchedDatasets.length > 0 && (
                  <span className="text-sm text-gray-500">
                    ({watchedDatasets.length})
                  </span>
                )}
              </div>

              {watchedDatasets.length === 0 ? (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You're not following any datasets yet.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/my-datasets">Browse Public Datasets</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchedDatasets.map((watch) => {
                    const dataset = watch.dataset;
                    return (
                      <div
                        key={dataset.id}
                        className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-black dark:text-white">
                              {dataset.template.name} in {dataset.cityName}
                              {dataset.area.countryCode &&
                                ` (${dataset.area.countryCode})`}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              by{" "}
                              {dataset.user.name ||
                                dataset.user.email.split("@")[0]}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              dataset.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {dataset.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                          <span>Data count: {dataset.dataCount}</span>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/dataset/${dataset.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {watchedDatasets.length >= 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/watched-datasets">View All</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
