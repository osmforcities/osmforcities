import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ResolvingMetadata } from "next";
import { resolveTemplate } from "@/lib/template-resolver";
import { getAreaDetailsById } from "@/lib/nominatim";
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
  description: "Shops where pharmacists sell medicines",
  translations: [{ locale: "pt-BR", name: "Farmácias", description: "Lojas que vendem medicamentos" }],
};
const layoutOpenGraph = {
  openGraph: { images: [{ url: "/og-image.png" }], description: "Layout default" },
};

function metadataFor(templateId = "pharmacies") {
  return generateMetadata(
    { params: Promise.resolve({ areaId: "5400890", templateId }) },
    Promise.resolve(layoutOpenGraph) as unknown as ResolvingMetadata
  );
}

describe("dataset page metadata", () => {
  beforeEach(() => {
    vi.mocked(getAreaDetailsById).mockResolvedValue(lisbon);
    vi.mocked(resolveTemplate).mockResolvedValue(pharmacies as never);
  });

  it("names the template and area in the locale, for the tab and the link preview", async () => {
    expect(await metadataFor()).toEqual({
      title: "Farmácias em Lisboa",
      description: "Lojas que vendem medicamentos",
      openGraph: {
        images: [{ url: "/og-image.png" }],
        title: "Farmácias em Lisboa",
        description: "Lojas que vendem medicamentos",
      },
    });
  });

  it("keeps the layout description when the template has none", async () => {
    vi.mocked(resolveTemplate).mockResolvedValue({ ...pharmacies, description: null, translations: [] } as never);
    const metadata = await metadataFor();
    expect(metadata).not.toHaveProperty("description");
    expect(metadata.openGraph?.description).toBe("Layout default");
  });

  it("leaves the layout defaults for an unknown template or area", async () => {
    vi.mocked(resolveTemplate).mockResolvedValue(null);
    expect(await metadataFor("not-a-template")).toEqual({});

    vi.mocked(resolveTemplate).mockRejectedValue(new Error("db down"));
    expect(await metadataFor()).toEqual({});

    vi.mocked(resolveTemplate).mockResolvedValue(pharmacies as never);
    vi.mocked(getAreaDetailsById).mockResolvedValue(null);
    expect(await metadataFor()).toEqual({});
  });
});
