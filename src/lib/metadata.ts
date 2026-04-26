import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { SUPPORTED_LOCALES } from "./constants";

export interface PageMetadata {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string;
}

export const DEFAULT_SEO = {
  title: "OSM for Cities",
  description: "Monitor OpenStreetMap datasets across cities",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://osmforcities.org",
  ogImage: "/og-image.png",
};

/**
 * Generate localized metadata with full SEO support
 */
export function getLocalizedMetadata(
  locale: Locale,
  pageConfig: PageMetadata,
): Metadata {
  const { title, description, path, noIndex } = pageConfig;

  // Include locale prefix in URL construction
  const url = path
    ? `${DEFAULT_SEO.siteUrl}/${locale}${path}`
    : `${DEFAULT_SEO.siteUrl}/${locale}`;

  const images = pageConfig.ogImage
    ? [{ url: `${DEFAULT_SEO.siteUrl}${pageConfig.ogImage}`, width: 1200, height: 630, alt: title }]
    : [{ url: `${DEFAULT_SEO.siteUrl}${DEFAULT_SEO.ogImage}`, width: 1200, height: 630, alt: DEFAULT_SEO.title }];

  return {
    title,
    description,
    metadataBase: new URL(DEFAULT_SEO.siteUrl),
    alternates: {
      canonical: url,
      languages: {
        en: path ? `${DEFAULT_SEO.siteUrl}/en${path}` : `${DEFAULT_SEO.siteUrl}/en`,
        "pt-BR": path ? `${DEFAULT_SEO.siteUrl}/pt-BR${path}` : `${DEFAULT_SEO.siteUrl}/pt-BR`,
        es: path ? `${DEFAULT_SEO.siteUrl}/es${path}` : `${DEFAULT_SEO.siteUrl}/es`,
      },
    },
    openGraph: {
      type: "website",
      siteName: DEFAULT_SEO.title,
      title,
      description,
      url,
      images,
      locale,
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale) as Locale[],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
  };
}
