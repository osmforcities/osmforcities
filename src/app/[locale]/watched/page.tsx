import { Metadata } from "next";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";
import DatasetList from "@/components/dataset-list";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

// Add generateStaticParams for static rendering
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Watched" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

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

export default async function WatchedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  const user = await getUserFromCookie();
  const t = await getTranslations("Watched");

  if (!user) {
    redirect("/");
  }

  const watchedDatasets = await getWatchedDatasets(user.id);

  return (
    <TabLayout activeTab="watched" isAdmin={user.isAdmin}>
      <DatasetList
        datasets={watchedDatasets}
        title={t("title")}
        emptyMessage={t("emptyMessage")}
        emptyActionText={t("emptyActionText")}
        emptyActionHref="/public"
        showCreator
      />
    </TabLayout>
  );
}
