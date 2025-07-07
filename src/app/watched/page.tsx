import { Metadata } from "next";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";
import DatasetList from "@/components/dataset-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Following - OSM for Cities",
  description: "Datasets you're following",
};

async function getWatchedDatasets(userId: string) {
  const watchedDatasets = await prisma.datasetWatch.findMany({
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
  });

  return watchedDatasets.map((watch) => watch.dataset);
}

export default async function WatchedPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect("/");
  }

  const watchedDatasets = await getWatchedDatasets(user.id);

  return (
    <TabLayout activeTab="watched" isAdmin={user.isAdmin}>
      <DatasetList
        datasets={watchedDatasets}
        title="Following"
        emptyMessage="You're not following any datasets yet."
        emptyActionText="Browse Public Datasets"
        emptyActionHref="/public"
        showCreator
      />
    </TabLayout>
  );
}
