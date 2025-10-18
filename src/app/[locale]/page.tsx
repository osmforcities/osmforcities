import { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import HomeTabLayout from "@/components/home/home-tab-layout";

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

async function getPublicDatasets() {
  const publicDatasets = await prisma.dataset.findMany({
    where: {
      isActive: true,
    },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
        },
      },
      area: {
        select: {
          id: true,
          name: true,
          countryCode: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: { watchers: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50, // Limit to 50 most recent
  });

  return publicDatasets;
}

export default async function Home() {
  const session = await auth();
  const user = session?.user || null;
  const t = await getTranslations("Index");

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-full max-w-2xl text-center p-4 space-y-8">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-4">
            {t("title")}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/about">{t("learnMore")}</Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/enter">{t("enter")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all data needed for tabs
  const [watchedDatasets, publicDatasets] = await Promise.all([
    getWatchedDatasets(user.id),
    getPublicDatasets(),
  ]);

  return (
    <HomeTabLayout
      user={user}
      watchedDatasets={watchedDatasets}
      publicDatasets={publicDatasets}
    />
  );
}
