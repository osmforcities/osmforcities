import type { MetadataRoute } from "next";
import { PROTECTED_ROUTES } from "@/lib/protected-routes";
import { routing } from "@/i18n/routing";
import { DEFAULT_SEO } from "@/lib/metadata";

const siteUrl = DEFAULT_SEO.siteUrl;

// Generate disallow rules for protected routes across all locales
const disallowProtected = routing.locales.flatMap((locale) =>
  PROTECTED_ROUTES.map((route) => `/${locale}${route}`)
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/api/", ...disallowProtected],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
