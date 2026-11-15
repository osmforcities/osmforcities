import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTemplate } from "@/lib/template-resolver";
import { getAreaDetailsById } from "@/lib/nominatim";
import { DEFAULT_SEO } from "@/lib/metadata";
import type { Area } from "@/types/area";
import { generateMetadata } from "../page";

vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/template-resolver", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/template-resolver")>()),
  resolveTemplate: vi.fn(),
}));
vi.mock("@/lib/nominatim", () => ({ getAreaDetailsById: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "pt-BR",
  getTranslations: async () => (_key: string, v: { dataset: string; area: string }) =>
    `${v.dataset} em ${v.area}`,
}));

const lisbon = { name: "Lisboa", names: { en: "Lisbon", pt: "Lisboa" } } as unknown as Area;
const pharmacies = {
  name: "Pharmacies",
  isActive: true,
  description: "Shops where pharmacists sell medicines",
  translations: [{ locale: "pt-BR", name: "Farmácias", description: "Lojas que vendem medicamentos" }],
};

function metadataFor(templateId = "pharmacies", areaId = "5400890") {
  return generateMetadata({ params: Promise.resolve({ areaId, templateId }) });
}

describe("dataset page metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAreaDetailsById).mockResolvedValue(lisbon);
    vi.mocked(resolveTemplate).mockResolvedValue(pharmacies as never);
  });

  it("names the template and area in the locale, for the tab and the link preview", async () => {
    expect(await metadataFor()).toMatchObject({
      title: "Farmácias em Lisboa",
      description: "Lojas que vendem medicamentos",
      alternates: { canonical: expect.stringMatching(/\/pt-BR\/area\/5400890\/dataset\/pharmacies$/) },
      openGraph: { title: "Farmácias em Lisboa", description: "Lojas que vendem medicamentos" },
    });
  });

  it("uses the site description when the template has none", async () => {
    vi.mocked(resolveTemplate).mockResolvedValue({ ...pharmacies, description: null, translations: [] } as never);
    expect((await metadataFor()).description).toBe(DEFAULT_SEO.description);
  });

  it("leaves the layout defaults for an unknown template or area", async () => {
    expect(await metadataFor("pharmacies", "-1")).toEqual({});
    expect(getAreaDetailsById).not.toHaveBeenCalled();

    vi.mocked(resolveTemplate).mockResolvedValue({ ...pharmacies, isActive: false } as never);
    expect(await metadataFor()).toEqual({});

    vi.mocked(resolveTemplate).mockResolvedValue({ ...pharmacies, deprecatesAt: new Date() } as never);
    expect(await metadataFor()).toEqual({});

    vi.mocked(resolveTemplate).mockResolvedValue(null);
    expect(await metadataFor("not-a-template")).toEqual({});

    vi.mocked(resolveTemplate).mockRejectedValue(new Error("db down"));
    expect(await metadataFor()).toEqual({});

    vi.mocked(resolveTemplate).mockResolvedValue(pharmacies as never);
    vi.mocked(getAreaDetailsById).mockResolvedValue(null);
    expect(await metadataFor()).toEqual({});
  });
});
