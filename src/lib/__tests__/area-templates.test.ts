import { describe, it, expect } from "vitest";
import {
  buildAreaDataTypes,
  countTemplatesByTopic,
  findTopicOfCategory,
  groupTopicByCategory,
  listCommonTemplates,
  matchesSearch,
  type AreaTemplate,
  type CreatedDatasetStatus,
} from "../area-templates";

const tpl = (
  id: string,
  name: string,
  categorySlug = "bus",
  topicSlug = "mobility",
  over: Partial<AreaTemplate> = {}
): AreaTemplate => ({
  id,
  name,
  description: null,
  categorySlug,
  topicSlug,
  tags: [],
  commonRank: null,
  ...over,
});

const status = (
  templateId: string,
  over: Partial<CreatedDatasetStatus> = {}
): CreatedDatasetStatus => ({
  templateId,
  dataCount: 0,
  contributors: 0,
  lastEditedAt: null,
  savedCount: 0,
  isFeatured: false,
  ...over,
});

describe("buildAreaDataTypes", () => {
  it("attaches status only to templates that have a dataset", () => {
    const rows = buildAreaDataTypes([tpl("a", "Alpha"), tpl("b", "Beta")], [
      status("a", { dataCount: 5 }),
    ]);
    const a = rows.find((r) => r.id === "a")!;
    const b = rows.find((r) => r.id === "b")!;
    expect(a.status?.dataCount).toBe(5);
    expect(b.status).toBeUndefined();
  });

  it("orders featured, then saved, then other-created, then uncreated", () => {
    const rows = buildAreaDataTypes(
      [tpl("u", "Uncreated"), tpl("c", "Created"), tpl("s", "Saved"), tpl("f", "Featured")],
      [
        status("f", { dataCount: 1, isFeatured: true }),
        status("s", { dataCount: 1, savedCount: 3 }),
        status("c", { dataCount: 1 }),
      ]
    );
    expect(rows.map((r) => r.id)).toEqual(["f", "s", "c", "u"]);
  });

  it("sorts within the created bands by dataCount desc", () => {
    const rows = buildAreaDataTypes(
      [tpl("small", "Small"), tpl("big", "Big")],
      [status("small", { dataCount: 10 }), status("big", { dataCount: 99 })]
    );
    expect(rows.map((r) => r.id)).toEqual(["big", "small"]);
  });

  it("sorts uncreated rows alphabetically by name", () => {
    const rows = buildAreaDataTypes([tpl("z", "Zebra"), tpl("a", "Apple")], []);
    expect(rows.map((r) => r.id)).toEqual(["a", "z"]);
  });
});

describe("listCommonTemplates", () => {
  it("keeps only ranked templates, in rank order", () => {
    const common = listCommonTemplates([
      tpl("schools", "Schools", "education", "education-culture", { commonRank: 1 }),
      tpl("benches", "Benches"),
      tpl("stops", "Bus stops", "bus", "mobility", { commonRank: 0 }),
    ]);
    expect(common.map((t) => t.id)).toEqual(["stops", "schools"]);
  });
});

describe("countTemplatesByTopic", () => {
  it("counts templates per topic, sorted by slug", () => {
    const counts = countTemplatesByTopic([
      tpl("a", "A", "bus", "mobility"),
      tpl("b", "B", "healthcare", "health"),
      tpl("c", "C", "mobility", "mobility"),
    ]);
    expect(counts).toEqual([
      { topicSlug: "health", count: 1 },
      { topicSlug: "mobility", count: 2 },
    ]);
  });
});

describe("groupTopicByCategory", () => {
  it("groups a topic's templates by child category, direct members last, names A to Z", () => {
    const groups = groupTopicByCategory(
      [
        tpl("taxi", "Taxi ranks", "mobility", "mobility"),
        tpl("rail", "Railway stations", "rail", "mobility"),
        tpl("stops", "Bus stops", "bus", "mobility"),
        tpl("lanes", "Bus lanes", "bus", "mobility"),
        tpl("clinics", "Clinics", "healthcare", "health"),
      ],
      "mobility"
    );
    expect(groups).toEqual([
      {
        categorySlug: "bus",
        templates: [
          expect.objectContaining({ id: "lanes" }),
          expect.objectContaining({ id: "stops" }),
        ],
      },
      { categorySlug: "rail", templates: [expect.objectContaining({ id: "rail" })] },
      { categorySlug: "mobility", templates: [expect.objectContaining({ id: "taxi" })] },
    ]);
  });

  it("returns no groups for an unknown topic", () => {
    expect(groupTopicByCategory([tpl("a", "A")], "nope")).toEqual([]);
  });
});

describe("findTopicOfCategory", () => {
  const templates = [
    tpl("stops", "Bus stops", "bus", "mobility"),
    tpl("taxi", "Taxi ranks", "mobility", "mobility"),
  ];

  it("returns the parent topic of a child category", () => {
    expect(findTopicOfCategory(templates, "bus")).toBe("mobility");
  });

  it("returns a topic for its own slug", () => {
    expect(findTopicOfCategory(templates, "mobility")).toBe("mobility");
  });

  it("returns undefined for an unknown category", () => {
    expect(findTopicOfCategory(templates, "nope")).toBeUndefined();
  });
});

describe("matchesSearch", () => {
  const cycleways = tpl("cycleways", "Cycleways", "cycling", "mobility", {
    description: "Paths built for bicycles",
    tags: ["highway=cycleway"],
  });

  it("matches name, description or tags, ignoring case and outer spaces", () => {
    expect(matchesSearch(cycleways, "  CYCLE ")).toBe(true);
    expect(matchesSearch(cycleways, "bicycles")).toBe(true);
    expect(matchesSearch(cycleways, "highway=")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesSearch(cycleways, "pharmacy")).toBe(false);
  });
});
