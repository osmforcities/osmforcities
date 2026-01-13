/**
 * Dashboard page - shows watched datasets for authenticated users
 * Redirects to /enter if not authenticated
 */

import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard - OSM for Cities",
  description: "Manage your watched OpenStreetMap datasets",
};

/** Fetches datasets watched by the user */
async function getWatchedDatasets(userId: string) {
  const watchedDatasets = await prisma.datasetWatch.findMany({
    where: { userId },
    include: {
      dataset: {
        include: {
          template: true,
          area: true,
          _count: {
            select: { watchers: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return watchedDatasets.map((watch) => watch.dataset);
}

export default async function Dashboard() {
  const session = await auth();
  const user = session?.user || null;

  if (!user) {
    redirect({ href: "/enter", locale: "en" });
  }

  const tabT = await getTranslations("TabLayout");
  const watchedDatasets = await getWatchedDatasets(user.id);

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
            activeTab="following"
          />

          <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
            <DashboardGrid datasets={watchedDatasets} />
          </div>
        </div>
      </div>
    </div>
  );
}
