import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DatasetCards } from "@/components/area/dataset-cards";
import { resolveAreaName } from "@/lib/area-name";
import { parseAreaIdOrNotFound } from "@/lib/area-route";
import { getActiveTemplates } from "@/lib/area-templates";
import { categoryLabel } from "@/lib/category-label";
import { groupTopicByCategory } from "@/lib/template-topics";
import { getAreaDetailsById } from "@/lib/nominatim";
import type { MessageResolver } from "@/lib/tag-i18n";

export const revalidate = 3600;

type TopicPageProps = {
  params: Promise<{ areaId: string; slug: string; category?: string[] }>;
};

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { areaId, slug, category } = await params;
  const locale = await getLocale();
  const [areaInfo, t, labelT] = await Promise.all([
    getAreaDetailsById(parseAreaIdOrNotFound(areaId), locale),
    getTranslations("AreaPage"),
    getTranslations("CategoryLabel"),
  ]);
  if (!areaInfo) return {};

  return {
    title: t("topicMetaTitle", {
      topic: categoryLabel(labelT as unknown as MessageResolver, category?.[0] ?? slug),
      area: resolveAreaName(areaInfo, locale),
    }),
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { areaId, slug, category = [] } = await params;
  const [categorySlug, ...rest] = category;
  const locale = await getLocale();
  const templates = await getActiveTemplates(locale);

  const shownTemplates = categorySlug
    ? groupTopicByCategory(templates, slug).find((group) => group.categorySlug === categorySlug)
        ?.templates
    : templates.filter((template) => template.topicSlug === slug);
  if (!shownTemplates?.length || rest.length > 0) notFound();

  return <DatasetCards templates={shownTemplates} areaId={areaId} />;
}
