import { Metadata } from "next";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";
import DatasetList from "@/components/dataset-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Datasets - OSM for Cities",
  description: "All public datasets on the platform",
};

async function getPublicDatasets() {
  const publicDatasets = await prisma.dataset.findMany({
    where: {
      isPublic: true,
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      area: {
        select: {
          id: true,
          name: true,
          countryCode: true,
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

export default async function PublicPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect("/");
  }

  const publicDatasets = await getPublicDatasets();

  return (
    <TabLayout activeTab="public" isAdmin={user.isAdmin}>
      <DatasetList
        datasets={publicDatasets}
        title="Public Datasets"
        emptyMessage="No public datasets found."
        emptyActionText="Create the First Public Dataset"
        emptyActionHref="/my-datasets/create"
        showCreator
      />
    </TabLayout>
  );
}
