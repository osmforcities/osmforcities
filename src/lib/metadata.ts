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
  ogImage: "/og-image.png", // TODO: Separate PR
  twitterCreator: "@osmforcities", // TODO: Add when exists
};

/**
 * Generate localized metadata with full SEO support
 */
export function getLocalizedMetadata(
  locale: Locale,
  pageConfig: PageMetadata,
): Metadata {
  const { title, description, path, noIndex } = pageConfig;
  const url = path ? `${DEFAULT_SEO.siteUrl}${path}` : DEFAULT_SEO.siteUrl;
  const images = pageConfig.ogImage
    ? [{ url: `${DEFAULT_SEO.siteUrl}${pageConfig.ogImage}`, width: 1200, height: 630, alt: title }]
    : [{ url: `${DEFAULT_SEO.siteUrl}${DEFAULT_SEO.ogImage}`, width: 1200, height: 630, alt: DEFAULT_SEO.title }];

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: generateAlternateLinks(path || "/"),
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
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((img) => img.url),
      creator: DEFAULT_SEO.twitterCreator,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
  };
}

/**
 * Generate alternate language links for hreflang
 */
function generateAlternateLinks(path: string): Record<string, string> {
  const links: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    links[locale] = `${DEFAULT_SEO.siteUrl}/${locale}${path}`;
  }
  links["x-default"] = `${DEFAULT_SEO.siteUrl}/en${path}`;
  return links;
}
