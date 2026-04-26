import { describe, it, expect, beforeEach } from "vitest";
import { getLocalizedMetadata } from "../metadata";
import type { Locale } from "@/i18n/routing";

describe("getLocalizedMetadata", () => {
  const siteUrl = "https://osmforcities.org";

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = siteUrl;
  });

  describe("canonical URL construction", () => {
    it("should include locale prefix for English", () => {
      const metadata = getLocalizedMetadata("en", {
        title: "Test",
        description: "Test",
        path: "/about",
      });

      expect(metadata.metadataBase).toEqual(new URL(siteUrl));
      expect(metadata.alternates?.canonical).toBe(`${siteUrl}/en/about`);
      expect(metadata.openGraph?.url).toBe(`${siteUrl}/en/about`);
    });

    it("should include locale prefix for pt-BR", () => {
      const metadata = getLocalizedMetadata("pt-BR" as Locale, {
        title: "Test",
        description: "Test",
        path: "/about",
      });

      expect(metadata.metadataBase).toEqual(new URL(siteUrl));
      expect(metadata.alternates?.canonical).toBe(`${siteUrl}/pt-BR/about`);
      expect(metadata.openGraph?.url).toBe(`${siteUrl}/pt-BR/about`);
    });

    it("should include locale prefix for Spanish", () => {
      const metadata = getLocalizedMetadata("es" as Locale, {
        title: "Test",
        description: "Test",
        path: "/about",
      });

      expect(metadata.metadataBase).toEqual(new URL(siteUrl));
      expect(metadata.alternates?.canonical).toBe(`${siteUrl}/es/about`);
      expect(metadata.openGraph?.url).toBe(`${siteUrl}/es/about`);
    });

    it("should include hreflang links for all locales", () => {
      const metadata = getLocalizedMetadata("en", {
        title: "Test",
        description: "Test",
        path: "/about",
      });

      expect(metadata.alternates?.languages).toEqual({
        en: `${siteUrl}/en/about`,
        "pt-BR": `${siteUrl}/pt-BR/about`,
        es: `${siteUrl}/es/about`,
      });
    });
  });
});
