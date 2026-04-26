import { test, expect } from "@playwright/test";

test.describe("SEO Implementation", () => {
  test.describe("English Locale (en)", () => {
    test("should have correct meta tags on home page", async ({ page }) => {
      await page.goto("/en");

      // Title and description
      await expect(page).toHaveTitle(/OSM for Cities/);
      const metaDescription = page
        .locator('meta[name="description"]')
        ;
      await expect(metaDescription).toHaveAttribute("content", );

      // Canonical URL with locale prefix (may have trailing slash)
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(/https:\/\/osmforcities\.org\/en\/?/);

      // Hreflang links for all locales
      const enHreflang = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute("href");
      const ptBrHreflang = await page.locator('link[rel="alternate"][hreflang="pt-BR"]').getAttribute("href");
      const esHreflang = await page.locator('link[rel="alternate"][hreflang="es"]').getAttribute("href");

      expect(enHreflang).toMatch(/https:\/\/osmforcities\.org\/en\/?/);
      expect(ptBrHreflang).toMatch(/https:\/\/osmforcities\.org\/pt-BR\/?/);
      expect(esHreflang).toMatch(/https:\/\/osmforcities\.org\/es\/?/);
    });

    test("should have structured data (JSON-LD) on home page", async ({ page }) => {
      await page.goto("/en");

      // Check for Organization schema
      const orgSchema = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const orgScript = scripts.find(s => {
          try {
            const data = JSON.parse(s.textContent || '');
            return data['@type'] === 'Organization';
          } catch {
            return false;
          }
        });
        return orgScript ? JSON.parse(orgScript.textContent || '') : null;
      });

      expect(orgSchema).toBeTruthy();
      expect(orgSchema["@type"]).toBe("Organization");
      expect(orgSchema.name).toBeTruthy();
      expect(orgSchema.url).toBeTruthy();
    });

    test("should have correct meta tags on about page", async ({ page }) => {
      await page.goto("/en/about");

      await expect(page).toHaveTitle(/About/);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(/https:\/\/osmforcities\.org\/en\/about\/?/);
    });
  });

  test.describe("Portuguese Locale (pt-BR)", () => {
    test("should have correct meta tags on home page", async ({ page }) => {
      await page.goto("/pt-BR");

      // Title and description
      await expect(page).toHaveTitle(/OSM for Cities/);
      const metaDescription = page
        .locator('meta[name="description"]')
        ;
      await expect(metaDescription).toHaveAttribute("content", );

      // Canonical URL with locale prefix (may have trailing slash)
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(/https:\/\/osmforcities\.org\/pt-BR\/?/);

      // Hreflang links
      const ptBrHreflang = await page.locator('link[rel="alternate"][hreflang="pt-BR"]').getAttribute("href");
      expect(ptBrHreflang).toMatch(/https:\/\/osmforcities\.org\/pt-BR\/?/);
    });

    test("should have structured data (JSON-LD) on home page", async ({ page }) => {
      await page.goto("/pt-BR");

      const orgSchema = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const orgScript = scripts.find(s => {
          try {
            const data = JSON.parse(s.textContent || '');
            return data['@type'] === 'Organization';
          } catch {
            return false;
          }
        });
        return orgScript ? JSON.parse(orgScript.textContent || '') : null;
      });

      expect(orgSchema).toBeTruthy();
      expect(orgSchema["@type"]).toBe("Organization");
    });
  });

  test.describe("robots.txt", () => {
    test("should block API routes and protected routes", async ({ request }) => {
      const response = await request.get("/robots.txt");
      const text = await response.text();

      // Should disallow API routes
      expect(text).toContain("Disallow: /api/");

      // Should disallow protected routes for all locales
      expect(text).toContain("Disallow: /en/dashboard");
      expect(text).toContain("Disallow: /pt-BR/dashboard");
      expect(text).toContain("Disallow: /es/dashboard");
      expect(text).toContain("Disallow: /en/preferences");
      expect(text).toContain("Disallow: /pt-BR/preferences");
      expect(text).toContain("Disallow: /es/preferences");

      // Should reference sitemap
      expect(text).toContain("Sitemap:");
    });
  });

  test.describe("sitemap.xml", () => {
    test("should include public pages for all locales", async ({ request }) => {
      const response = await request.get("/sitemap.xml");
      const text = await response.text();

      // Should include home page for all locales (with or without trailing slash)
      expect(text).toContain("<loc>https://osmforcities.org/en/</loc>");
      expect(text).toContain("<loc>https://osmforcities.org/pt-BR/</loc>");
      expect(text).toContain("<loc>https://osmforcities.org/es/</loc>");

      // Should include about page for all locales
      expect(text).toContain("<loc>https://osmforcities.org/en/about</loc>");
      expect(text).toContain("<loc>https://osmforcities.org/pt-BR/about</loc>");
      expect(text).toContain("<loc>https://osmforcities.org/es/about</loc>");
    });
  });
});
