import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import {
  Users,
  Activity,
  Calendar,
  BarChart3,
  MapPin,
  Database,
  Download,
} from "lucide-react";
import DatasetRefreshButton from "@/components/dataset/refresh-button";
import DatasetWatchButton from "@/components/dataset/watch-button";
import type { Dataset } from "@/schemas/dataset";

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

type DatasetSidePanelProps = {
  dataset: Dataset;
};

export async function DatasetSidePanel({ dataset }: DatasetSidePanelProps) {
  const t = await getTranslations("DatasetPage");
  const explorerT = await getTranslations("DatasetPage");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">{dataset.template.name}</h1>

        <div className="flex items-center gap-2 text-lg text-muted-foreground mb-3">
          <MapPin className="h-4 w-4" />
          {dataset.cityName}
          {dataset.area.countryCode && ` (${dataset.area.countryCode})`}
        </div>

        {dataset.template.description && (
          <p className="text-muted-foreground text-sm">
            {dataset.template.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <DatasetWatchButton
          datasetId={dataset.id}
          isWatched={dataset.isWatched || false}
        />
        <DatasetRefreshButton
          datasetId={dataset.id}
          isActive={dataset.isActive}
        />
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            dataset.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {dataset.isActive ? t("active") : t("inactive")}
        </span>
        <span
          className={`px-2 py-1 text-xs rounded-full capitalize ${
            true
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          }`}
        >
          {t("public")}
        </span>
      </div>

      {/* Key Stats */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t("datasetStats")}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <Database className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-600">
              {dataset.dataCount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("totalFeatures")}
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <Users className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-600">
              {dataset.stats?.editorsCount?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("totalEditors")}
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <Activity className="h-4 w-4 text-purple-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-purple-600">
              {dataset.stats?.changesetsCount?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("changesets")}
            </div>
          </div>

          {true && (
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <Users className="h-4 w-4 text-orange-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-600">
                {dataset.watchersCount?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("watchers")}
              </div>
            </div>
          )}

          {dataset.stats?.averageElementAge && (
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <Calendar className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-indigo-600">
                {Math.round(dataset.stats.averageElementAge)}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("avgAgeDays")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Assessment */}
      {dataset.stats?.recentActivity && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("overallAssessment")}</h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              let activityLevel;
              if (dataset.stats.recentActivity.elementsEdited > 50) {
                activityLevel = {
                  label: t("veryActive"),
                  color: "green",
                };
              } else if (dataset.stats.recentActivity.elementsEdited > 10) {
                activityLevel = {
                  label: t("active"),
                  color: "yellow",
                };
              } else {
                activityLevel = {
                  label: t("lowActivity"),
                  color: "gray",
                };
              }
              return (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${getColorClasses(
                    activityLevel.color
                  )} flex items-center gap-1`}
                >
                  <BarChart3 className="h-3 w-3" />
                  {activityLevel.label}
                </span>
              );
            })()}

            {(() => {
              let communityStrength;
              if ((dataset.stats?.editorsCount || 0) > 5) {
                communityStrength = {
                  label: t("strongCommunity"),
                  color: "blue",
                };
              } else if ((dataset.stats?.editorsCount || 0) > 1) {
                communityStrength = {
                  label: t("someContributors"),
                  color: "yellow",
                };
              } else {
                communityStrength = {
                  label: t("singleEditor"),
                  color: "gray",
                };
              }
              return (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${getColorClasses(
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

      {/* Download Section */}
      <div className="pt-4 border-t">
        <div className="flex justify-center">
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {explorerT("downloadGeoJSON")}
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      {dataset.lastChecked && (
        <div className="text-xs text-muted-foreground text-center">
          <div className="flex items-center justify-center gap-1">
            <Activity className="h-3 w-3" />
            {t("lastChecked")}{" "}
            {new Date(dataset.lastChecked).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
