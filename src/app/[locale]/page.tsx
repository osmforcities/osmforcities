import { Metadata } from "next";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { Hero } from "@/components/home/sections/hero";
import { Features } from "@/components/home/sections/features";
import { DatasetShowcase } from "@/components/home/sections/dataset-showcase";
import { UseCases } from "@/components/home/sections/use-cases";
import { FinalCTA } from "@/components/home/sections/final-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OSM for Cities - Monitor OpenStreetMap Datasets",
  description:
    "Track changes in OpenStreetMap datasets across cities worldwide.",
};

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

export default async function Home() {
  const session = await auth();
  const user = session?.user || null;
  const tabT = await getTranslations("TabLayout");

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <Hero />
        <Features />
        <UseCases />
        <DatasetShowcase />
        <FinalCTA />
      </div>
    );
  }

  // Fetch watched datasets for the dashboard grid
  const watchedDatasets = await getWatchedDatasets(user.id);

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
