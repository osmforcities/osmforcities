import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { SUPPORTED_LOCALES } from "./constants";
import { buildLocaleUrls } from "./utils";

export interface PageMetadata {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string;
}

export const DEFAULT_SEO = {
  title: "OSM for Cities",
  description: "Search any city, browse 200+ urban infrastructure categories, and download data as GeoJSON. Built on OpenStreetMap.",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://osmforcities.org",
  ogImage: "/og-image.png",
};

const SITE_URL = new URL(DEFAULT_SEO.siteUrl);

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
    metadataBase: SITE_URL,
    alternates: {
      canonical: url,
      languages: buildLocaleUrls(DEFAULT_SEO.siteUrl, path),
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
