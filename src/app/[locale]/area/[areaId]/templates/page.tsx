import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

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
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  redirect({ href: `/area/${areaId}${query}`, locale });
}
