import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getActiveTemplates } from "@/lib/area-templates";
import { categoryBrowsePath } from "@/lib/template-topics";

export const revalidate = 3600;

type AreaTemplatesPageProps = {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function AreaTemplatesPage({
  params,
  searchParams,
}: AreaTemplatesPageProps) {
  const { areaId } = await params;
  const { category } = await searchParams;
  const locale = await getLocale();
  const templates = await getActiveTemplates(locale);
  redirect({ href: categoryBrowsePath(areaId, templates, category), locale });
}
