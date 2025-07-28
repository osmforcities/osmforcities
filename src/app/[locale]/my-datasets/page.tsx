import { Metadata } from "next";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";
import DatasetList from "@/components/dataset-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Datasets - OSM for Cities",
  description: "Your created datasets",
};

async function getCreatedDatasets(userId: string) {
  const createdDatasets = await prisma.dataset.findMany({
    where: { userId },
    include: {
      template: true,
      area: true,
      _count: {
        select: { watchers: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return createdDatasets.map((dataset) => ({
    ...dataset,
    canDelete: dataset._count.watchers <= 1,
  }));
}

export default async function MyDatasetsPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect("/");
  }

  const createdDatasets = await getCreatedDatasets(user.id);

  return (
    <TabLayout activeTab="my-datasets" isAdmin={user.isAdmin}>
      <DatasetList
        datasets={createdDatasets}
        title="Your Datasets"
        emptyMessage="You haven't created any datasets yet."
        emptyActionText="Create Your First Dataset"
        emptyActionHref="/my-datasets/create"
        showCreateButton
        isOwned
      />
    </TabLayout>
  );
}
