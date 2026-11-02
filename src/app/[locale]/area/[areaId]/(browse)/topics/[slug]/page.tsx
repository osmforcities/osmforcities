import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TopicGroups } from "@/components/area/topic-groups";
import { resolveAreaName } from "@/lib/area-name";
import { parseAreaIdOrNotFound } from "@/lib/area-route";
import { getAreaDataTypes } from "@/lib/area-templates";
import { categoryLabel } from "@/lib/category-label";
import { getAreaDetailsById } from "@/lib/nominatim";
import type { MessageResolver } from "@/lib/tag-i18n";

export const revalidate = 3600;

type TopicPageProps = {
  params: Promise<{ areaId: string; slug: string }>;
};

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { areaId, slug } = await params;
  const locale = await getLocale();
  const [areaInfo, t, labelT] = await Promise.all([
    getAreaDetailsById(parseAreaIdOrNotFound(areaId), locale),
    getTranslations("AreaPage"),
    getTranslations("CategoryLabel"),
  ]);
  if (!areaInfo) return {};

  return {
    title: t("topicMetaTitle", {
      topic: categoryLabel(labelT as unknown as MessageResolver, slug),
      area: resolveAreaName(areaInfo, locale),
    }),
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { areaId, slug } = await params;
  const locale = await getLocale();
  const templates = await getAreaDataTypes(parseAreaIdOrNotFound(areaId), locale);
  if (!templates.some((template) => template.topicSlug === slug)) notFound();

  return <TopicGroups templates={templates} topicSlug={slug} areaId={areaId} />;
}
