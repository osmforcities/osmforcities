import { describe, it, expect, vi } from "vitest";
import { buildMagicLinkEmail } from "../magic-link-email";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const url = "https://osmforcities.org/api/auth/verify?token=abc&x=1";

describe("buildMagicLinkEmail", () => {
  it("renders the English email with link, fallback URL and expiry", async () => {
    const { subject, html, text } = await buildMagicLinkEmail("en", url);

    expect(subject).toBe("Sign in to OSM for Cities");
    expect(html).toContain("<h1");
    expect(html).toContain(`href="${url.replace("&", "&amp;")}"`);
    expect(html).toMatch(/>Sign in<\/a>/);
    expect(html).toContain("Or copy this link into your browser:");
    expect(html).toContain("expires in 24 hours");
    expect(html).toContain("you can ignore this email");

    expect(text).toContain("Sign in to OSM for Cities");
    expect(text.split(url)).toHaveLength(2);
    expect(text).toContain("expires in 24 hours");
    expect(text).toContain("you can ignore this email");
  });

  it("renders pt-BR without English leftovers", async () => {
    const { subject, html, text } = await buildMagicLinkEmail("pt-BR", url);

    expect(subject).toBe("Entrar no OSM for Cities");
    expect(html).toContain('lang="pt-BR"');
    expect(html).toMatch(/>Entrar<\/a>/);
    expect(html).toContain("24 horas");
    expect(html).toContain("Ou copie e cole este link no seu navegador:");
    expect(text).toContain(url);
    expect(text).toContain("24 horas");
    for (const english of ["Sign in", "link to sign", "Visit", "expires", "ignore"]) {
      expect(html).not.toContain(english);
      expect(text).not.toContain(english);
    }
  });
});
