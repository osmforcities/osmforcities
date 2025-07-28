import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  Activity,
  Calendar,
  BarChart3,
  MapPin,
  Database,
} from "lucide-react";
import DatasetRefreshButton from "@/components/dataset-refresh-button";
import DatasetMap from "@/components/dataset-map";
import DatasetWatchButton from "@/components/dataset-watch-button";
import { prisma } from "@/lib/db";
import { DatasetSchema, type Dataset } from "@/schemas/dataset";
import type { FeatureCollection } from "geojson";
import { getUserFromCookie } from "@/lib/auth";

async function getDataset(id: string): Promise<Dataset | null> {
  try {
    const user = await getUserFromCookie();

    const rawDataset = await prisma.dataset.findUnique({
      where: { id },
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
        watchers: user
          ? {
              where: { userId: user.id },
              select: { id: true, userId: true, createdAt: true },
            }
          : false,
        _count: {
          select: { watchers: true },
        },
      },
    });

    if (!rawDataset) return null;

    return DatasetSchema.parse({
      ...rawDataset,
      geojson: rawDataset.geojson as FeatureCollection | null,
      bbox: rawDataset.bbox as number[] | null,
      area: {
        ...rawDataset.area,
        geojson: rawDataset.area.geojson as FeatureCollection | null,
      },
      isWatched: user ? rawDataset.watchers.length > 0 : false,
      watchersCount: rawDataset._count.watchers,
      canDelete: user
        ? user.id === rawDataset.user.id && rawDataset._count.watchers <= 1
        : false,
    });
  } catch (error) {
    console.error("Error fetching dataset:", error);
    return null;
  }
}

function getActivityLevel(elementsEdited: number) {
  if (elementsEdited > 50) return { label: "Very Active", color: "green" };
  if (elementsEdited > 10) return { label: "Active", color: "yellow" };
  return { label: "Low Activity", color: "gray" };
}

function getCommunityStrength(editors: number) {
  if (editors > 5) return { label: "Strong Community", color: "blue" };
  if (editors > 1) return { label: "Some Contributors", color: "yellow" };
  return { label: "Single Editor", color: "gray" };
}

function getColorClasses(color: string) {
  const colors = {
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    yellow:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    purple:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return colors[color as keyof typeof colors] || colors.gray;
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset(id);

  if (!dataset) {
    notFound();
  }

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

          <div className="space-y-8">
            <div className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {dataset.template.name}
                  </h1>
                  <div className="flex items-center gap-2 text-xl text-muted-foreground">
                    <MapPin className="h-5 w-5" />
                    {dataset.cityName}
                    {dataset.area.countryCode &&
                      ` (${dataset.area.countryCode})`}
                  </div>
                  {dataset.template.description && (
                    <p className="text-muted-foreground mt-3">
                      {dataset.template.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DatasetWatchButton
                    datasetId={dataset.id}
                    isWatched={dataset.isWatched || false}
                    isPublic={dataset.isPublic}
                  />
                  <DatasetRefreshButton
                    datasetId={dataset.id}
                    isActive={dataset.isActive}
                  />
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      dataset.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {dataset.isActive ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm rounded-full capitalize ${
                      dataset.isPublic
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {dataset.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <DatasetMap dataset={dataset} />
              </div>

              <div className="mt-6 relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 shadow-lg">
                <div className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6" />
                      <h2 className="text-xl font-bold">Dataset Stats</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-80">Category</div>
                      <div className="text-sm font-semibold capitalize">
                        {dataset.template.category}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full"></div>
                  <div className="absolute -right-8 -bottom-4 w-16 h-16 bg-white/5 rounded-full"></div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-blue-200/50 dark:border-blue-700/50 text-center hover:scale-105 transition-transform">
                      <Database className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {dataset.dataCount.toLocaleString()}
                      </div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Total Features
                      </div>
                    </div>

                    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-green-200/50 dark:border-green-700/50 text-center hover:scale-105 transition-transform">
                      <Users className="h-5 w-5 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {dataset.stats?.editorsCount?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Total Editors
                      </div>
                    </div>

                    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-purple-200/50 dark:border-purple-700/50 text-center hover:scale-105 transition-transform">
                      <Activity className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {dataset.stats?.changesetsCount?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Changesets
                      </div>
                    </div>

                    {dataset.isPublic && (
                      <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-orange-200/50 dark:border-orange-700/50 text-center hover:scale-105 transition-transform">
                        <Users className="h-5 w-5 text-orange-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {dataset.watchersCount?.toLocaleString() || 0}
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Watchers
                        </div>
                      </div>
                    )}

                    {dataset.stats?.averageElementAge && (
                      <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-indigo-200/50 dark:border-indigo-700/50 text-center hover:scale-105 transition-transform">
                        <Calendar className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-indigo-600 mb-1">
                          {Math.round(dataset.stats.averageElementAge)}
                        </div>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Avg Age (days)
                        </div>
                      </div>
                    )}
                  </div>

                  {dataset.stats?.recentActivity && (
                    <div className="border-t border-blue-200/30 dark:border-blue-700/30 pt-6">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity (Last 3 Months)
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 p-4 rounded-lg text-center">
                          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                            {dataset.stats.recentActivity.elementsEdited.toLocaleString()}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Elements Edited
                          </div>
                          {dataset.dataCount > 0 && (
                            <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                              {(
                                (dataset.stats.recentActivity.elementsEdited /
                                  dataset.dataCount) *
                                100
                              ).toFixed(1)}
                              % of total
                            </div>
                          )}
                        </div>
                        <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 p-4 rounded-lg text-center">
                          <div className="text-xl font-bold text-green-700 dark:text-green-300">
                            {dataset.stats.recentActivity.editors.toLocaleString()}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Active Editors
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 p-4 rounded-lg text-center">
                          <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                            {dataset.stats.recentActivity.changesets.toLocaleString()}
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            Recent Changesets
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {dataset.stats?.recentActivity && (
                    <div className="border-t border-blue-200/30 dark:border-blue-700/30 pt-6 mt-6">
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                        Overall Assessment
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const activityLevel = getActivityLevel(
                            dataset.stats.recentActivity.elementsEdited
                          );
                          return (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${getColorClasses(
                                activityLevel.color
                              )} flex items-center gap-1`}
                            >
                              <BarChart3 className="h-3 w-3" />
                              {activityLevel.label}
                            </span>
                          );
                        })()}

                        {(() => {
                          const communityStrength = getCommunityStrength(
                            dataset.stats?.editorsCount || 0
                          );
                          return (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${getColorClasses(
                                communityStrength.color
                              )} flex items-center gap-1`}
                            >
                              <Users className="h-3 w-3" />
                              {communityStrength.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-blue-200/30 dark:border-blue-700/30 pt-4 mt-6">
                    <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                      {dataset.lastChecked && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Last Checked:{" "}
                          {new Date(dataset.lastChecked).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
