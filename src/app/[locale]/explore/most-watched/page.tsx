import { redirect } from "@/i18n/navigation";
import { Locale } from "next-intl";

export default async function MostWatchedRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: "/explore/most-saved", locale });
}
