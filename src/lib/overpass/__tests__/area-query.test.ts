import { describe, it, expect } from "vitest";
import { fillAreaQuery } from "../area-query";

describe("fillAreaQuery", () => {
  it("fills every area placeholder with the relation id", () => {
    expect(fillAreaQuery("rel({OSM_RELATION_ID});\nis_in({OSM_RELATION_ID});", 5400890)).toBe(
      "rel(5400890);\nis_in(5400890);"
    );
  });
});
