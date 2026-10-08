import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notifyDatasetReady } from "../notify-ready";

vi.mock("@/lib/db", () => ({
  prisma: {
    datasetSave: { findMany: vi.fn(), updateMany: vi.fn() },
    dataset: { findUniqueOrThrow: vi.fn() },
  },
}));

// The real sender: a no-op under NODE_ENV=test, exactly as with EMAIL_DISABLE.
vi.mock("@/lib/email", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/email")>();
  return { sendEmail: vi.fn(real.sendEmail) };
});

const save = (id: string, email: string, language: string) => ({
  id,
  user: { email, language },
});

const dataset = () => ({
  areaId: 271110,
  templateId: "schools",
  cityName: "Amsterdam",
  area: { name: "Amsterdam", names: { pt: "Amesterdão" } },
  template: {
    name: "Schools",
    description: null,
    translations: [{ locale: "pt-BR", name: "Escolas", description: null }],
  },
});

const findMany = vi.mocked(prisma.datasetSave.findMany);
const updateMany = vi.mocked(prisma.datasetSave.updateMany);
const findDataset = vi.mocked(prisma.dataset.findUniqueOrThrow);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "https://osmforcities.test");
  findMany.mockResolvedValue([
    save("s1", "a@x.test", "en"),
    save("s2", "b@x.test", "pt-BR"),
  ] as never);
  updateMany.mockResolvedValue({ count: 1 } as never);
  findDataset.mockResolvedValue(dataset() as never);
});

describe("notifyDatasetReady", () => {
  it("sends one mail per flagged save in the user's language, then clears each flag", async () => {
    await notifyDatasetReady("ds-1", 42);

    expect(findMany.mock.calls[0][0]?.where).toEqual({
      datasetId: "ds-1",
      notifyWhenReady: true,
    });
    expect(findDataset).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const [en, pt] = vi.mocked(sendEmail).mock.calls.map(([o]) => o);
    expect(en.to).toBe("a@x.test");
    expect(en.subject).toBe("The map of Schools in Amsterdam is ready");
    expect(en.html).toContain(
      'href="https://osmforcities.test/en/area/271110/dataset/schools"'
    );
    expect(pt.subject).toBe("O mapa de Escolas em Amesterdão está pronto");
    expect(pt.html).toContain("/pt-BR/area/271110/dataset/schools");
    expect(updateMany.mock.calls.map(([a]) => a.where)).toEqual([
      { id: "s1", notifyWhenReady: true },
      { id: "s2", notifyWhenReady: true },
    ]);
  });

  it("an empty bake sends nothing and keeps the flags", async () => {
    await notifyDatasetReady("ds-1", 0);

    expect(findMany).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("a failed send keeps that save's flag and still mails the others", async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("postmark 500"));

    await expect(notifyDatasetReady("ds-1", 42)).resolves.toBeUndefined();

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(updateMany.mock.calls.map(([a]) => a.where)).toEqual([
      { id: "s2", notifyWhenReady: true },
    ]);
  });

  it("never throws, even when the lookup fails", async () => {
    findMany.mockRejectedValue(new Error("db blip"));

    await expect(notifyDatasetReady("ds-1", 42)).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("an unsaved dataset (no flagged saves) sends nothing", async () => {
    findMany.mockResolvedValue([] as never);

    await notifyDatasetReady("ds-1", 42);

    expect(findDataset).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("escapes OSM-sourced names in the HTML body", async () => {
    findMany.mockResolvedValue([save("s1", "a@x.test", "en")] as never);
    findDataset.mockResolvedValue({
      ...dataset(),
      area: { name: "<b>Town</b>", names: {} },
    } as never);

    await notifyDatasetReady("ds-1", 42);

    expect(vi.mocked(sendEmail).mock.calls[0][0].html).toContain(
      "&lt;b&gt;Town&lt;/b&gt;"
    );
  });
});
