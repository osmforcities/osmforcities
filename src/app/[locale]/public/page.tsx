import { redirect } from "@/i18n/navigation";
import { Locale } from "next-intl";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  
  return redirect({ href: "/", locale });
}
