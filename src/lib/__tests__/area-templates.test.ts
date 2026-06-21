import { describe, it, expect } from "vitest";
import { buildAreaDataTypes, type AreaTemplate, type CreatedDatasetStatus } from "../area-templates";

const tpl = (id: string, name: string, category = "transport"): AreaTemplate => ({
  id,
  name,
  description: null,
  category,
  categoryLabel: category,
  tags: [],
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
