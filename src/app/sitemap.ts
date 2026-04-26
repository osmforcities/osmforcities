import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/lib/constants";
import { buildLocaleUrls } from "@/lib/utils";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://osmforcities.org";
const BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();

const PUBLIC_ROUTES = ["/", "/about"];

/**
 * Generate sitemap for static pages
 * Dynamic dataset pages will be added in a follow-up
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [];

  for (const locale of SUPPORTED_LOCALES) {
    for (const route of PUBLIC_ROUTES) {
      staticPages.push({
        url: `${siteUrl}/${locale}${route}`,
        lastModified: new Date(BUILD_TIME),
        changeFrequency: "weekly" as const,
        priority: route === "/" ? 1 : 0.8,
        alternates: {
          languages: buildLocaleUrls(siteUrl, route),
        },
      });
    }
  }

  return staticPages;
}
