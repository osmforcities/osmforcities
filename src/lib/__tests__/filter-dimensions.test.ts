import { describe, it, expect } from "vitest";
import {
  ageDimensionFromCounts,
  resolveFilterDimensions,
  type FilterDimension,
} from "../filter-dimensions";

const byKey = (dims: FilterDimension[], key: string) =>
  dims.find((d) => d.key === key);

describe("ageDimensionFromCounts", () => {
  it("keeps the buckets in ordinal order and drops the empty ones", () => {
    expect(ageDimensionFromCounts([2, 0, 1, 3])).toEqual({
      key: "age",
      kind: "age",
      values: [
        { value: "recent", count: 2 },
        { value: "older", count: 1 },
        { value: "very-old", count: 3 },
      ],
      missing: 0,
    });
  });
});

describe("resolveFilterDimensions", () => {
  const storedSurface: FilterDimension = {
    key: "surface",
    kind: "tag",
    values: [{ value: "asphalt", count: 99 }],
    missing: 0,
  };
  const storedAge: FilterDimension = {
    key: "age",
    kind: "age",
    values: [{ value: "very-old", count: 99 }],
    missing: 0,
  };

  it("uses the stored dimensions when they cover the current filterableTags", () => {
    const dims = resolveFilterDimensions(["surface"], [storedSurface, storedAge]);

    expect(byKey(dims, "surface")).toEqual(storedSurface);
    expect(byKey(dims, "age")).toEqual(storedAge);
  });

  it("gives a retuned template one empty dimension per current tag", () => {
    const dims = resolveFilterDimensions(["material"], [storedSurface, storedAge]);

    expect(byKey(dims, "surface")).toBeUndefined();
    expect(byKey(dims, "material")).toEqual({
      key: "material",
      kind: "tag",
      values: [],
      missing: 0,
    });
  });

  it("returns an empty age dimension when none is stored", () => {
    const dims = resolveFilterDimensions(["surface"], [storedSurface]);

    expect(byKey(dims, "age")).toEqual({
      key: "age",
      kind: "age",
      values: [],
      missing: 0,
    });
  });
});
