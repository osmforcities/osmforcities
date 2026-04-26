/**
 * Home/Landing page - public facing marketing page
 * Always shows landing content (Hero, Features, Use Cases, etc.)
 * Authenticated users should go to /dashboard for their dashboard
 */

import { Metadata } from "next";
import { auth } from "@/auth";
import { Hero } from "@/components/home/sections/hero";
import { Features } from "@/components/home/sections/features";
import { DatasetShowcase } from "@/components/home/sections/dataset-showcase";
import { UseCases } from "@/components/home/sections/use-cases";
import { FinalCTA } from "@/components/home/sections/final-cta";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocalizedMetadata } from "@/lib/metadata";
import { StructuredData } from "@/components/structured-data";
import type { Locale } from "@/i18n/routing";
import { DEFAULT_SEO } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("SEO");

  return getLocalizedMetadata(locale, {
    title: t("home.title"),
    description: t("home.description"),
    path: "/",
  });
}

/**
 * Landing page component - always shows public marketing content
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const { locale } = await params;
  const siteUrl = DEFAULT_SEO.siteUrl;
  const t = await getTranslations("SEO");
  const tNav = await getTranslations("Navigation");

  return (
    <>
      <StructuredData
        id="structured-data-webpage"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("home.title"),
          description: t("home.description"),
          url: `${siteUrl}/${locale}/`,
          inLanguage: locale,
          isPartOf: {
            "@type": "WebSite",
            url: siteUrl,
          },
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
              name: tNav("home"),
              item: `${siteUrl}/${locale}/`,
            },
          ],
        }}
      />
      <div className="min-h-screen bg-white dark:bg-black">
        <Hero />
        <Features />
        <UseCases />
        <DatasetShowcase />
        {!isAuthenticated && <FinalCTA />}
      </div>
    </>
  );
}
