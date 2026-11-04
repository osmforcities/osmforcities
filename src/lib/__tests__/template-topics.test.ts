import { describe, it, expect } from "vitest";
import type { AreaTemplate } from "@/lib/area-templates";
import {
  categoryBrowsePath,
  countTemplatesByTopic,
  findTopicOfCategory,
  groupTopicByCategory,
  listCommonTemplates,
} from "../template-topics";

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
  commonRank: null,
  ...over,
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
  it("counts templates per topic", () => {
    const counts = countTemplatesByTopic([
      tpl("a", "A", "bus", "mobility"),
      tpl("b", "B", "healthcare", "health"),
      tpl("c", "C", "mobility", "mobility"),
    ]);
    expect(counts).toEqual([
      { topicSlug: "mobility", count: 2 },
      { topicSlug: "health", count: 1 },
    ]);
  });
});

describe("groupTopicByCategory", () => {
  it("groups a topic's templates by child category, in the given order", () => {
    const groups = groupTopicByCategory(
      [
        tpl("taxi", "Taxi ranks", "mobility", "mobility"),
        tpl("rail", "Railway stations", "rail", "mobility"),
        tpl("lanes", "Bus lanes", "bus", "mobility"),
        tpl("stops", "Bus stops", "bus", "mobility"),
        tpl("clinics", "Clinics", "healthcare", "health"),
      ],
      "mobility"
    );
    expect(groups).toEqual([
      { categorySlug: "mobility", templates: [expect.objectContaining({ id: "taxi" })] },
      { categorySlug: "rail", templates: [expect.objectContaining({ id: "rail" })] },
      {
        categorySlug: "bus",
        templates: [
          expect.objectContaining({ id: "lanes" }),
          expect.objectContaining({ id: "stops" }),
        ],
      },
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

describe("categoryBrowsePath", () => {
  const templates = [
    tpl("stops", "Bus stops", "bus", "mobility"),
    tpl("taxi", "Taxi ranks", "mobility", "mobility"),
  ];

  it("points a child category at its own page under the topic", () => {
    expect(categoryBrowsePath("42", templates, "bus")).toBe("/area/42/topics/mobility/bus");
  });

  it("points a topic at its topic page", () => {
    expect(categoryBrowsePath("42", templates, "mobility")).toBe("/area/42/topics/mobility");
  });

  it("falls back to the hub for a missing or unknown category", () => {
    expect(categoryBrowsePath("42", templates, undefined)).toBe("/area/42");
    expect(categoryBrowsePath("42", templates, "nope")).toBe("/area/42");
  });
});
