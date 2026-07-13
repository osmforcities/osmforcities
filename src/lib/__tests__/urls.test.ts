import { describe, it, expect } from "vitest";
import { getDatasetPath, getDatasetUrl } from "../urls";

describe("getDatasetPath", () => {
  it("builds the area/template dataset path", () => {
    expect(getDatasetPath({ locale: "en", areaId: 12345, templateId: "schools" })).toBe(
      "/en/area/12345/dataset/schools"
    );
  });
});

describe("getDatasetUrl", () => {
  it("prefixes the path with the base URL", () => {
    expect(
      getDatasetUrl("https://osmforcities.com", {
        locale: "en",
        areaId: 12345,
        templateId: "schools",
      })
    ).toBe("https://osmforcities.com/en/area/12345/dataset/schools");
  });
});
