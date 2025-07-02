import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Plus } from "lucide-react";
import HomeTabs from "@/components/home-tabs";

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
    }),
  ]);

  const createdDatasetsWithDeleteFlag = createdDatasets.map((dataset) => ({
    ...dataset,
    canDelete: dataset._count.watchers <= 1,
  }));

  return { createdDatasets: createdDatasetsWithDeleteFlag, watchedDatasets };
}

async function getAdminData() {
  const [templates, users] = await Promise.all([
    prisma.template.findMany({
      include: {
        _count: {
          select: { datasets: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      include: {
        _count: {
          select: { datasets: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { templates, users };
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

  let adminData: Awaited<ReturnType<typeof getAdminData>> | null = null;
  if (user.isAdmin) {
    adminData = await getAdminData();
  }

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
                Manage your datasets and explore the platform
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

          <HomeTabs
            createdDatasets={createdDatasets}
            watchedDatasets={watchedDatasets.map((watch) => watch.dataset)}
            templates={adminData?.templates || []}
            users={adminData?.users || []}
            isAdmin={user.isAdmin}
          />
        </div>
      </div>
    </div>
  );
}
