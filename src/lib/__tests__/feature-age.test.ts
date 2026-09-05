import { describe, it, expect } from "vitest";
import { AGE_TS_KEY, ageCategoryOfTs, ageStep } from "../feature-age";

const DAY_S = 86_400;
const NOW_MS = 1_700_000_000_000; // fixed reference, ms
const NOW_S = NOW_MS / 1000;

const tsDaysAgo = (days: number) => NOW_S - days * DAY_S;

describe("ageCategoryOfTs", () => {
  it("buckets each boundary inclusively (<=7, <=30, <=90 days)", () => {
    expect(ageCategoryOfTs(tsDaysAgo(0), NOW_MS)).toBe("recent");
    expect(ageCategoryOfTs(tsDaysAgo(7), NOW_MS)).toBe("recent");
    expect(ageCategoryOfTs(tsDaysAgo(7.001), NOW_MS)).toBe("medium");
    expect(ageCategoryOfTs(tsDaysAgo(30), NOW_MS)).toBe("medium");
    expect(ageCategoryOfTs(tsDaysAgo(30.001), NOW_MS)).toBe("older");
    expect(ageCategoryOfTs(tsDaysAgo(90), NOW_MS)).toBe("older");
    expect(ageCategoryOfTs(tsDaysAgo(90.001), NOW_MS)).toBe("very-old");
  });

  it("treats a future timestamp as recent", () => {
    expect(ageCategoryOfTs(tsDaysAgo(-1), NOW_MS)).toBe("recent");
  });

  it("falls back to very-old for missing or non-numeric values", () => {
    expect(ageCategoryOfTs(undefined, NOW_MS)).toBe("very-old");
    expect(ageCategoryOfTs(null, NOW_MS)).toBe("very-old");
    expect(ageCategoryOfTs("2020-01-01", NOW_MS)).toBe("very-old");
    expect(ageCategoryOfTs(NaN, NOW_MS)).toBe("very-old");
  });
});

describe("ageStep", () => {
  const values = {
    recent: "r",
    medium: "m",
    older: "o",
    "very-old": "v",
  };

  it("builds a step expression on _ts with ascending cutoffs at 90/30/7 days", () => {
    expect(ageStep(values, NOW_MS)).toEqual([
      "step",
      ["number", ["get", AGE_TS_KEY], 0],
      "v",
      NOW_S - 90 * DAY_S,
      "o",
      NOW_S - 30 * DAY_S,
      "m",
      NOW_S - 7 * DAY_S,
      "r",
    ]);
  });

  it("agrees with ageCategoryOfTs at every bucket boundary", () => {
    // Evaluate the step expression by hand: last stop whose input <= ts wins
    const expr = ageStep(values, NOW_MS) as unknown[];
    const evaluate = (ts: number | undefined) => {
      const input = typeof ts === "number" ? ts : 0;
      let result = expr[2];
      for (let i = 3; i < expr.length; i += 2) {
        if (input >= (expr[i] as number)) result = expr[i + 1];
      }
      return result;
    };
    const label = { recent: "r", medium: "m", older: "o", "very-old": "v" };

    for (const days of [0, 7, 7.001, 30, 30.001, 90, 90.001, 400]) {
      const ts = tsDaysAgo(days);
      expect(evaluate(ts)).toBe(label[ageCategoryOfTs(ts, NOW_MS)]);
    }
    expect(evaluate(undefined)).toBe("v");
  });

  it("collapses to the bare value when all buckets match", () => {
    expect(
      ageStep({ recent: 1, medium: 1, older: 1, "very-old": 1 }, NOW_MS)
    ).toBe(1);
  });
});
