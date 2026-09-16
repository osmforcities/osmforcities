import { describe, it, expect } from "vitest";
import { NominatimResultSchema } from "@/schemas/nominatim";
import parisRaw from "@/lib/__tests__/fixtures/nominatim-search-paris.json";

describe("NominatimResultSchema", () => {
  // The same schema validates /lookup, which backs the area page, dataset
  // creation and refresh. Ranking hints must never make a lookup fail.
  it("drops malformed ranking hints instead of rejecting the result", () => {
    const result = NominatimResultSchema.parse({
      ...parisRaw[0],
      extratags: { wikidata: "Q90", population: 2133111 },
      importance: "high",
      place_rank: null,
    });

    expect(result.osm_id).toBe(7444);
    expect(result.extratags).toBeUndefined();
    expect(result.importance).toBeUndefined();
    expect(result.place_rank).toBeUndefined();
  });

  it("keeps well-formed ranking hints", () => {
    const result = NominatimResultSchema.parse(parisRaw[0]);

    expect(result.extratags?.wikidata).toBe("Q90");
    expect(result.importance).toBeCloseTo(0.897, 3);
    expect(result.place_rank).toBe(15);
  });
});
