import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { DatasetCards } from "@/components/area/dataset-cards";
import { getActiveTemplates } from "@/lib/area-templates";
import { categoryBrowsePath, listCommonTemplates } from "@/lib/template-topics";

export const revalidate = 3600;

type AreaHubPageProps = {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function AreaHubPage({ params, searchParams }: AreaHubPageProps) {
  const { areaId } = await params;
  const { category } = await searchParams;
  const locale = await getLocale();
  const templates = await getActiveTemplates(locale);

  if (category) {
    redirect({ href: categoryBrowsePath(areaId, templates, category), locale });
  }

  return <DatasetCards templates={listCommonTemplates(templates)} areaId={areaId} />;
}
