import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAreaDetailsById } from "@/lib/nominatim";
import { prisma } from "@/lib/db";
import { resolveTemplateForLocale } from "@/lib/template-locale";
import { DatasetGrid } from "@/components/ui/template-grid";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Link } from "@/components/ui/link";
import { trackEvent } from "@/lib/umami";
import type { Metadata } from "next";
import { getLocalizedMetadata } from "@/lib/metadata";
import { StructuredData } from "@/components/structured-data";
import type { Locale } from "@/i18n/routing";
import { DEFAULT_SEO } from "@/lib/metadata";

type AreaPageProps = {
  params: Promise<{
    areaId: string;
    locale: Locale;
  }>;
};

async function getActiveTemplates(locale: string) {
  const rows = await prisma.template.findMany({
    where: { isActive: true },
    include: {
      translations: true,
    },
    orderBy: { name: "asc" },
  });
  return rows.map((t) => {
    const resolved = resolveTemplateForLocale(t, locale);
    return {
      id: resolved.id,
      name: resolved.name,
      description: resolved.description,
      category: resolved.category,
      tags: resolved.tags,
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ areaId: string; locale: Locale }>;
}): Promise<Metadata> {
  const { areaId, locale } = await params;
  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    return {
      title: "Area not found - OSM for Cities",
    };
  }

  const areaInfo = await getAreaDetailsById(osmRelationId);
  if (!areaInfo) {
    return {
      title: "Area not found - OSM for Cities",
    };
  }

  const t = await getTranslations("SEO");

  return getLocalizedMetadata(locale, {
    title: t("area.title", { area: areaInfo.name }),
    description: t("area.description", { area: areaInfo.name }),
    path: `/area/${areaId}`,
    noIndex: true,
  });
}

export default async function AreaPage({ params }: AreaPageProps) {
  const { areaId, locale } = await params;
  const t = await getTranslations("AreaPage");
  const navT = await getTranslations("Navigation");

  const osmRelationId = parseInt(areaId, 10);
  if (isNaN(osmRelationId)) {
    notFound();
  }

  const [areaInfo, templates] = await Promise.all([
    getAreaDetailsById(osmRelationId),
    getActiveTemplates(locale),
  ]);

  if (!areaInfo) {
    notFound();
  }

  trackEvent("datasets_list_view", "/datasets/list/view");

  const breadcrumbItems = [
    { label: navT("home"), href: "/" },
    { label: areaInfo.country || "Area" },
    ...(areaInfo.state ? [{ label: areaInfo.state }] : []),
    { label: areaInfo.name },
  ];

  const siteUrl = DEFAULT_SEO.siteUrl;

  return (
    <>
      <StructuredData
        id="structured-data-webpage"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${areaInfo.name} - Datasets`,
          description: `Explore OpenStreetMap datasets for ${areaInfo.name}`,
          url: `${siteUrl}/${locale}/area/${areaId}`,
          inLanguage: locale,
        }}
      />
      <StructuredData
        id="structured-data-breadcrumb"
        schema={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${siteUrl}/${locale}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: areaInfo.name,
              item: `${siteUrl}/${locale}/area/${areaId}`,
            },
          ],
        }}
      />
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <BreadcrumbNav items={breadcrumbItems} />
        </div>

        {/* Area Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {areaInfo.name}
              </h1>
              <p className="text-lg text-gray-600 mb-2">
                {areaInfo.state && areaInfo.country
                  ? `${areaInfo.state}, ${areaInfo.country}`
                  : areaInfo.state || areaInfo.country || ""}
              </p>
              <Link
                href={`https://www.openstreetmap.org/relation/${areaInfo.id}`}
                external
                size="sm"
              >
                {t("idLabel")}
                {areaInfo.id}
              </Link>
            </div>
          </div>
        </div>

        {/* Datasets Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <DatasetGrid templates={templates} areaId={areaId} />
        </div>
      </div>
    </div>
    </>
  );
}
