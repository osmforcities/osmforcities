import { describe, it, expect } from "vitest";
import {
  galleryCenter,
  isDue,
  markLine,
  nextDueStopIndex,
  reviewTally,
  type ReviewMark,
} from "../map-gallery";

describe("galleryCenter", () => {
  it("uses the area center", () => {
    expect(galleryCenter({ centerLat: 52.37, centerLon: 4.89 }, [0, 0, 1, 1])).toEqual([
      4.89, 52.37,
    ]);
  });

  it("falls back to the middle of the dataset bbox", () => {
    expect(galleryCenter({ centerLat: null, centerLon: null }, [4, 52, 5, 53])).toEqual([
      4.5, 52.5,
    ]);
  });

  it("is null with neither", () => {
    expect(galleryCenter({ centerLat: null, centerLon: null }, null)).toBeNull();
  });
});

describe("review marks", () => {
  const stops = ["a z11", "a z12", "b z11"];
  const ok: ReviewMark = { ok: true, note: "", zoom: 11, view: "Default" };
  const notOk: ReviewMark = { ok: false, note: "too small", zoom: 12.4, view: "" };

  it("counts a stale mark as due", () => {
    expect(isDue(undefined)).toBe(true);
    expect(isDue({ ...ok, stale: true })).toBe(true);
    expect(isDue(ok)).toBe(false);
  });

  it("finds the next due stop after the current one, wrapping around", () => {
    const marks = { "a z12": ok };
    expect(nextDueStopIndex(stops, 0, marks)).toBe(2);
    expect(nextDueStopIndex(stops, 2, marks)).toBe(0);
    expect(nextDueStopIndex(stops, 0, { "a z12": ok, "b z11": ok })).toBe(-1);
  });

  it("tallies only the current stops", () => {
    const marks = { "a z11": ok, "a z12": notOk, "b z11": { ...ok, stale: true }, gone: ok };
    expect(reviewTally(stops, marks)).toEqual({ ok: 1, notOk: 1, left: 1 });
  });

  it("writes one line per stop with mark, zoom, view and note", () => {
    expect(markLine("a z11", ok)).toBe("- ok: a z11 (seen at z11, Default)");
    expect(markLine("a z12", notOk)).toBe("- NOT OK: a z12 (seen at z12.4): too small");
    expect(markLine("b z11", { ...ok, stale: true })).toBe("- unmarked: b z11");
    expect(markLine("b z11", undefined)).toBe("- unmarked: b z11");
  });
});
