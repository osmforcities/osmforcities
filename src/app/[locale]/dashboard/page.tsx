/**
 * Dashboard page - shows saved datasets for authenticated users
 * Redirects to /enter if not authenticated
 */

import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { trackEventAfterResponse } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { MAX_SAVES_PER_USER } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard - OSM for Cities",
  description: "Manage your saved OpenStreetMap datasets",
};

async function getSavedDatasets(userId: string) {
  const savedDatasets = await prisma.datasetSave.findMany({
    where: { userId },
    include: {
      dataset: {
        include: {
          template: {
            include: { category: true },
          },
          area: true,
          _count: {
            select: { savedBy: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return savedDatasets.map((save) => save.dataset);
}

export default async function Dashboard() {
  const session = await auth();
  const user = session?.user || null;
  const locale = await getLocale();

  if (!user) {
    redirect({ href: "/enter", locale });
  }

  const tabT = await getTranslations("TabLayout");
  const savedDatasets = await getSavedDatasets(user.id);

  await trackEventAfterResponse(ANALYTICS_EVENTS.SAVED_DATASETS_VIEW, "/datasets/saved/view");

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1
              className="text-3xl font-bold text-black dark:text-white"
              data-testid="dashboard-welcome-message"
            >
              {tabT("welcomeBack", { name: user.name || user.email })}
            </h1>
            <p
              className="text-gray-600 dark:text-gray-400 mt-1"
              data-testid="dashboard-subtitle"
            >
              {tabT("manageDatasetsSubtitle")}
            </p>
          </div>

          <DashboardTabs
            isAdmin={user.isAdmin}
            context="dashboard"
            activeTab="saved"
          />

          <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
            <DashboardGrid datasets={savedDatasets} saveLimit={MAX_SAVES_PER_USER} />
          </div>
        </div>
      </div>
    </div>
  );
}
