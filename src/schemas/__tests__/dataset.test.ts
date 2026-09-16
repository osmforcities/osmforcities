import { describe, it, expect } from "vitest";
import { DatasetSchema } from "@/schemas/dataset";

describe("DatasetSchema.tilesState", () => {
  const shape = DatasetSchema.pick({ tilesState: true });

  it("is optional — card-shaped selects that don't fetch it still parse", () => {
    expect(shape.parse({})).toEqual({});
  });

  it("accepts a state string and null", () => {
    expect(shape.parse({ tilesState: "pending" })).toEqual({
      tilesState: "pending",
    });
    expect(shape.parse({ tilesState: null })).toEqual({ tilesState: null });
  });
});
