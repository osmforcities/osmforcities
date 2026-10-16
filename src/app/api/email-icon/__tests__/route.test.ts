import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { GET } from "../route";

vi.mock("@/lib/db", () => ({
  prisma: { template: { findUnique: vi.fn() } },
}));

const findTemplate = vi.mocked(prisma.template.findUnique);
const CATEGORIES: Record<string, string> = { schools: "education", parks: "leisure" };
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

const get = (query: string) => GET(new Request(`https://x.test/api/email-icon?${query}`));
const isPng = async (response: Response) =>
  [...new Uint8Array(await response.arrayBuffer()).slice(0, 4)].join() === PNG_SIGNATURE.join();

beforeEach(() => {
  vi.clearAllMocks();
  findTemplate.mockImplementation((async ({ where }: { where: { id: string } }) =>
    where.id in CATEGORIES ? { category: { slug: CATEGORIES[where.id] } } : null) as never);
});

describe("GET /api/email-icon", () => {
  it("returns a cacheable PNG for a catalog template", async () => {
    const response = await get("template=schools");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age=86400");
    expect(await isPng(response)).toBe(true);
  });

  it("draws the template's own icon, not an empty tile", async () => {
    const png = async (query: string) => Buffer.from(await (await get(query)).arrayBuffer());

    expect((await png("template=schools")).equals(await png("template=parks"))).toBe(false);
  });

  it.each([
    "template=not-a-template",
    "template=",
    "",
    "template=schools&x=1",
    "template=schools&template=schools",
    "glyph=calendar&x=1",
  ])(
    "returns 404 for anything but one catalog template (%s)",
    async (query) => {
      expect((await get(query)).status).toBe(404);
    }
  );

  it("returns a small PNG for each UI glyph", async () => {
    for (const glyph of ["calendar", "features", "mappers", "alert"]) {
      const response = await get(`glyph=${glyph}`);
      expect(response.status).toBe(200);
      expect(await isPng(response)).toBe(true);
    }
    expect(findTemplate).not.toHaveBeenCalled();
  });

  it.each(["nope", "toString", "constructor", "__proto__"])("rejects unknown glyph %s", async (glyph) => {
    expect((await get(`glyph=${glyph}`)).status).toBe(404);
  });
});
