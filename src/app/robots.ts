import type { MetadataRoute } from "next";
import { PROTECTED_ROUTES } from "@/lib/protected-routes";
import { routing } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://osmforcities.org";

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
