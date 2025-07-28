import { Metadata } from "next";
import { getUserFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TabLayout from "@/components/tab-layout";
import DatasetList from "@/components/dataset-list";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Locale } from "next-intl";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

// See https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#static-rendering
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Public" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

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

export default async function PublicPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  const user = await getUserFromCookie();
  const t = await getTranslations("Public");

  if (!user) {
    redirect("/");
  }

  const publicDatasets = await getPublicDatasets();

  return (
    <TabLayout activeTab="public" isAdmin={user.isAdmin}>
      <DatasetList
        datasets={publicDatasets}
        title={t("title")}
        emptyMessage={t("emptyMessage")}
        emptyActionText={t("emptyActionText")}
        emptyActionHref="/my-datasets/create"
        showCreator
      />
    </TabLayout>
  );
}
