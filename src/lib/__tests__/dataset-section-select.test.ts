import { describe, it, expect } from "vitest";
import { sectionQueryArgs, DATASET_SELECT } from "@/lib/dataset-section-select";
import { CATALOG_FILTER } from "@/lib/dataset-catalog-filter";

describe("sectionQueryArgs", () => {
  it("passes take through and always selects the card shape plus saved counts", () => {
    const args = sectionQueryArgs("largest", 24);
    expect(args.take).toBe(24);
    expect(args.select).toMatchObject(DATASET_SELECT);
    expect(args.select._count).toEqual({ select: { savedBy: true } });
    expect(args.select.lastEditedAt).toBe(true);
    expect(args.select.contributorsCount).toBe(true);
    expect(args.select.recentlyEditedCount).toBe(true);
  });

  it("featured: featured-only where, no catalog filter, newest first", () => {
    const args = sectionQueryArgs("featured", 6);
    expect(args.where).toEqual({ isFeatured: true, dataCount: { gt: 0 } });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("recentlyEdited: catalog filter + non-null lastEditedAt, latest first", () => {
    const args = sectionQueryArgs("recentlyEdited", 6);
    expect(args.where).toMatchObject({
      isActive: true,
      lastEditedAt: { not: null },
      ...CATALOG_FILTER,
    });
    expect(args.orderBy).toEqual({ lastEditedAt: "desc" });
  });

  it("mostSaved: saved-only where, no catalog filter, by save count", () => {
    const args = sectionQueryArgs("mostSaved", 6);
    expect(args.where).toEqual({
      isActive: true,
      dataCount: { gt: 0 },
      savedBy: { some: {} },
    });
    expect(args.orderBy).toEqual({ savedBy: { _count: "desc" } });
  });

  it("mostContributors: catalog filter + non-null contributorsCount", () => {
    const args = sectionQueryArgs("mostContributors", 6);
    expect(args.where).toMatchObject({
      contributorsCount: { not: null },
      ...CATALOG_FILTER,
    });
    expect(args.orderBy).toEqual({ contributorsCount: "desc" });
  });

  it("largest: catalog filter, by feature count", () => {
    const args = sectionQueryArgs("largest", 6);
    expect(args.where).toMatchObject({ isActive: true, ...CATALOG_FILTER });
    expect(args.orderBy).toEqual({ dataCount: "desc" });
  });
});
