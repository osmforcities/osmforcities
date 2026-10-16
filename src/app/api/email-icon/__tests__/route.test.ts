import { describe, it, expect } from "vitest";
import { GET } from "../route";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

describe("GET /api/email-icon", () => {
  it("returns a cacheable PNG for a known template", async () => {
    const response = GET(new Request("https://x.test/api/email-icon?template=schools&category=education"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age=86400");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual(PNG_SIGNATURE);
  });

  it("draws the template's own icon, not an empty tile", async () => {
    const png = async (query: string) =>
      Buffer.from(await GET(new Request(`https://x.test/api/email-icon?${query}`)).arrayBuffer());

    const schools = await png("template=schools&category=education");
    const parks = await png("template=parks&category=leisure");

    expect(schools.equals(parks)).toBe(false);
  });

  it("falls back to a generic icon for unknown or missing params", async () => {
    const response = GET(new Request("https://x.test/api/email-icon"));

    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual(PNG_SIGNATURE);
  });
});
