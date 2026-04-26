import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://osmforcities.org";

/**
 * Generate robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/preferences", "/templates", "/users"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
