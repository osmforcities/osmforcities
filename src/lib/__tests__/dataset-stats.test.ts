import { describe, it, expect } from "vitest";
import { readStats, processDatasetStats } from "@/lib/dataset-stats";

describe("readStats", () => {
  it("returns null for null, scalar, and array stats values", () => {
    expect(readStats({ stats: null })).toBeNull();
    expect(readStats({ stats: 42 })).toBeNull();
    expect(readStats({ stats: "oops" })).toBeNull();
    expect(readStats({ stats: [1, 2] })).toBeNull();
  });

  it("passes through a legacy minimal blob", () => {
    const stats = readStats({ stats: { editorsCount: 3 } });
    expect(stats?.editorsCount).toBe(3);
    expect(stats?.mostRecentElement).toBeUndefined();
  });

  it("passes through a full stored blob with ISO-string dates", () => {
    const blob = {
      editorsCount: 5,
      mostRecentElement: "2025-01-01T00:00:00.000Z",
      recentActivity: { elementsEdited: 2, changesets: 1, editors: 1 },
    };
    const stats = readStats({ stats: blob });
    expect(stats?.mostRecentElement).toBe("2025-01-01T00:00:00.000Z");
    expect(stats?.recentActivity?.elementsEdited).toBe(2);
  });
});

describe("processDatasetStats", () => {
  it("falls back to zero contributors and an em dash on null stats", () => {
    const result = processDatasetStats({ dataCount: 7, stats: null }, "en");
    expect(result).toEqual({ features: 7, contributors: 0, lastEdited: "—" });
  });

  it("derives contributors and a relative last-edited from a real blob", () => {
    const result = processDatasetStats(
      {
        dataCount: 3,
        stats: { editorsCount: 4, mostRecentElement: "2025-01-01T00:00:00.000Z" },
      },
      "en"
    );
    expect(result.features).toBe(3);
    expect(result.contributors).toBe(4);
    expect(result.lastEdited).not.toBe("—");
  });
});
