import Fuse from "fuse.js";
import type { AreaTemplate } from "@/lib/area-templates";

export function createTemplateSearch(
  templates: AreaTemplate[],
  categoryLabel: (slug: string) => string
): (query: string) => AreaTemplate[] {
  const fuse = new Fuse(templates, {
    keys: [
      { name: "name", weight: 3 },
      { name: "description", weight: 1 },
      {
        name: "categoryLabels",
        weight: 1,
        getFn: (template) => [
          categoryLabel(template.categorySlug),
          categoryLabel(template.topicSlug),
        ],
      },
      { name: "englishName", weight: 0.5 },
      { name: "osmTags", weight: 0.5 },
    ],
    ignoreDiacritics: true,
    ignoreLocation: true,
    threshold: 0.3,
    useTokenSearch: true,
    tokenMatch: "all",
  });

  return (query) => fuse.search(query).map((result) => result.item);
}
