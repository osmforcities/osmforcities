import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getTranslations, getLocale } from "next-intl/server";
import { DATASET_FAILURE_FLAG_THRESHOLD } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dataset updates - OSM for Cities",
  description: "Refresh health across active datasets",
};

async function getUpdateStatus() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const activeWhere = { isActive: true } as const;

  const [activeTotal, refreshed24h, flagged, freshness, flaggedDatasets] =
    await Promise.all([
      prisma.dataset.count({ where: activeWhere }),
      prisma.dataset.count({
        where: { ...activeWhere, lastChecked: { gte: oneDayAgo } },
      }),
      prisma.dataset.count({
        where: {
          ...activeWhere,
          consecutiveFailures: { gte: DATASET_FAILURE_FLAG_THRESHOLD },
        },
      }),
      prisma.dataset.aggregate({
        where: { ...activeWhere, lastChecked: { not: null } },
        _max: { lastChecked: true },
        _min: { lastChecked: true },
      }),
      prisma.dataset.findMany({
        where: {
          ...activeWhere,
          consecutiveFailures: { gte: DATASET_FAILURE_FLAG_THRESHOLD },
        },
        include: { template: true },
        orderBy: [{ consecutiveFailures: "desc" }, { lastAttempted: "asc" }],
        take: 100,
      }),
    ]);

  const newestCheck = freshness._max.lastChecked;
  return {
    activeTotal,
    refreshed24h,
    staleOrNever: activeTotal - refreshed24h,
    flagged,
    newestCheck,
    oldestCheck: freshness._min.lastChecked,
    isHealthy: !!newestCheck && newestCheck >= twoHoursAgo,
    flaggedDatasets,
  };
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="text-2xl font-bold text-black dark:text-white">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

/**
 * Dataset updates admin page - refresh health + datasets flagged for review.
 * Redirects to /dashboard if not admin, /enter if not authenticated.
 */
export default async function DatasetsPage() {
  const session = await auth();
  const user = session?.user || null;
  const locale = await getLocale();
  const t = await getTranslations("DatasetUpdatesPage");
  const tabT = await getTranslations("TabLayout");

  if (!user) {
    return redirect({ href: "/enter", locale });
  }

  if (!user.isAdmin) {
    return redirect({ href: "/dashboard", locale });
  }

  const status = await getUpdateStatus();

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleString() : t("never");

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white">
              {tabT("welcomeBack", { name: user.name || user.email })}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {tabT("manageDatasetsSubtitle")}
            </p>
          </div>

          <DashboardTabs
            isAdmin={user.isAdmin}
            context="admin-datasets"
            activeTab="datasets"
          />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {t("title")}
              </h2>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  status.isHealthy
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                {status.isHealthy ? t("healthOk") : t("healthDegraded")}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label={t("statActive")} value={status.activeTotal} />
              <StatTile label={t("statRefreshed")} value={status.refreshed24h} />
              <StatTile label={t("statStale")} value={status.staleOrNever} />
              <StatTile label={t("statFlagged")} value={status.flagged} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                {t("newestCheck", { value: fmt(status.newestCheck) })}
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                {t("oldestCheck", { value: fmt(status.oldestCheck) })}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {t("flaggedHeading")}
              </h2>
              {status.flaggedDatasets.length > 0 && (
                <span className="text-sm text-gray-500">
                  {t("flaggedCount", { count: status.flaggedDatasets.length })}
                </span>
              )}
            </div>

            {status.flaggedDatasets.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {t("flaggedEmpty")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {status.flaggedDatasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div>
                        <h3 className="font-semibold text-black dark:text-white">
                          {dataset.cityName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {dataset.template.name}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 whitespace-nowrap">
                        {t("failureCount", {
                          count: dataset.consecutiveFailures,
                        })}
                      </span>
                    </div>
                    {dataset.lastError && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-mono break-words">
                        {t("lastError", { message: dataset.lastError })}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-500">
                      <span>
                        {t("lastAttempted", {
                          value: fmt(dataset.lastAttempted),
                        })}
                      </span>
                      <span>
                        {t("lastChecked", { value: fmt(dataset.lastChecked) })}
                      </span>
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
