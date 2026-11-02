import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AreaHub } from "@/components/area/area-hub";
import { parseAreaIdOrNotFound } from "@/lib/area-route";
import { getAreaDataTypes } from "@/lib/area-templates";
import { categoryBrowsePath } from "@/lib/template-topics";

export const revalidate = 3600;

type AreaHubPageProps = {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function AreaHubPage({ params, searchParams }: AreaHubPageProps) {
  const { areaId } = await params;
  const { category } = await searchParams;
  const locale = await getLocale();
  const templates = await getAreaDataTypes(parseAreaIdOrNotFound(areaId), locale);

  if (category) {
    redirect({ href: categoryBrowsePath(areaId, templates, category), locale });
  }

  return <AreaHub templates={templates} areaId={areaId} />;
}
