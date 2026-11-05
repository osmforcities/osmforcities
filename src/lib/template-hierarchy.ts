import { resolveTemplateForLocale } from "@/lib/template-locale";

type RelatedTemplate = {
  id: string;
  name: string;
  description: string | null;
  translations: Array<{ locale: string; name: string; description: string | null }>;
};

export type TemplateLink = { id: string; name: string };

export function resolveTemplateHierarchy<
  T extends {
    parent: (RelatedTemplate & { isActive: boolean; deprecatesAt: Date | null }) | null;
    children: RelatedTemplate[];
  },
>(template: T, locale: string) {
  const { parent, children, ...rest } = template;
  const toLink = (related: RelatedTemplate): TemplateLink => ({
    id: related.id,
    name: resolveTemplateForLocale(related, locale).name,
  });
  return {
    ...rest,
    parent: parent?.isActive && !parent.deprecatesAt ? toLink(parent) : null,
    children: children.map(toLink).sort((a, b) => a.name.localeCompare(b.name, locale)),
  };
}
