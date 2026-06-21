"use client";

import { GridList, GridListItem } from "react-aria-components";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryIcon } from "@/lib/category-icons";
import { useState, useMemo } from "react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  /** Leaf category slug — used for filtering. */
  category: string;
  /** Human-readable category name — used for display. */
  categoryLabel: string;
  tags: string[];
};

type DatasetGridProps = {
  templates: Template[];
  areaId: string;
  /** Category slug to pre-select (from the `?category=` URL param). */
  initialCategory?: string;
};

const ALL = "all";

/**
 * Browse templates for an area: a category sidebar (desktop) / dropdown (mobile)
 * plus a search box, filtering a responsive card grid. The active category is
 * seeded from the URL so arriving from an area category card lands pre-filtered.
 */
export function DatasetGrid({ templates, areaId, initialCategory }: DatasetGridProps) {
  const t = useTranslations("AreaPage");

  // Categories present in this template set: { slug, label, count }, sorted by label.
  const categories = useMemo(() => {
    const map = new Map<string, { slug: string; label: string; count: number }>();
    for (const tpl of templates) {
      const entry = map.get(tpl.category);
      if (entry) {
        entry.count += 1;
      } else {
        map.set(tpl.category, { slug: tpl.category, label: tpl.categoryLabel, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [templates]);

  const knownSlug = useMemo(
    () => new Set(categories.map((c) => c.slug)),
    [categories]
  );

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory && knownSlug.has(initialCategory) ? initialCategory : ALL
  );
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredTemplates = useMemo(() => {
    let filtered = templates;
    if (selectedCategory !== ALL) {
      filtered = filtered.filter((tpl) => tpl.category === selectedCategory);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (tpl) =>
          tpl.name.toLowerCase().includes(term) ||
          tpl.description?.toLowerCase().includes(term) ||
          tpl.categoryLabel.toLowerCase().includes(term) ||
          tpl.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [templates, selectedCategory, searchTerm]);

  if (templates.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title={t("noDatasetsAvailable")}
        description={t("noDatasetsDescription")}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:gap-8 lg:h-full lg:min-h-0">
      {/* Mobile category dropdown */}
      <div className="lg:hidden mb-4">
        <label className="sr-only" htmlFor="category-filter">
          {t("filterByCategory")}
        </label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
        >
          <option value={ALL}>{`${t("allDatasets")} (${templates.length})`}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {`${c.label} (${c.count})`}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop category sidebar — scrolls independently */}
      <aside className="hidden lg:block lg:w-56 lg:flex-shrink-0 lg:h-full lg:overflow-y-auto lg:pr-1">
        <nav aria-label={t("filterByCategory")} className="space-y-1">
          <CategoryItem
            label={t("allDatasets")}
            count={templates.length}
            active={selectedCategory === ALL}
            onClick={() => setSelectedCategory(ALL)}
          />
          {categories.map((c) => (
            <CategoryItem
              key={c.slug}
              label={c.label}
              count={c.count}
              active={selectedCategory === c.slug}
              onClick={() => setSelectedCategory(c.slug)}
            />
          ))}
        </nav>
      </aside>

      {/* Results — search stays fixed, grid scrolls independently */}
      <div className="flex-1 min-w-0 lg:h-full lg:flex lg:flex-col lg:min-h-0">
        <div className="mb-4 lg:flex-shrink-0">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("searchPlaceholder")}
          />
        </div>

        {filteredTemplates.length === 0 ? (
          <EmptyState
            type="no-results"
            title={t("noResults")}
            description={t("noResultsDescription")}
          />
        ) : (
          <GridList
            items={filteredTemplates}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1 lg:pb-1 lg:content-start"
            data-testid="template-grid"
            aria-label={t("findData")}
          >
            {(template) => (
              <GridListItem key={template.id} className="group h-full">
                <Card
                  href={`/area/${areaId}/dataset/${template.id}`}
                  description={template.description ?? undefined}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-olive-100 text-olive-600 rounded-lg">
                        {getCategoryIcon(template.categoryLabel)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-olive-700">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {template.categoryLabel}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardFooter>
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                            {t("moreTags", {
                              count: String(template.tags.length - 3),
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </GridListItem>
            )}
          </GridList>
        )}
      </div>
    </div>
  );
}

function CategoryItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-olive-100 text-olive-700 font-medium"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="truncate capitalize">{label}</span>
      <span className={`text-xs ${active ? "text-olive-600" : "text-gray-400"}`}>
        {count}
      </span>
    </button>
  );
}
