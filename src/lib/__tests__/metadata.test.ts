import { describe, it, expect, vi } from "vitest";
import { getLocalizedMetadata } from "../metadata";
import type { Locale } from "@/i18n/routing";

// Mock DEFAULT_SEO to control siteUrl in tests
vi.mock("../metadata", async () => {
  const actual = await vi.importActual("../metadata");
  const originalModule = actual as typeof import("../metadata");
  return {
    ...originalModule,
    DEFAULT_SEO: {
      ...originalModule.DEFAULT_SEO,
      siteUrl: "https://osmforcities.org",
    },
    getLocalizedMetadata: originalModule.getLocalizedMetadata,
  };
});

describe("getLocalizedMetadata", () => {
  const siteUrl = "https://osmforcities.org";

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
