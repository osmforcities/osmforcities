"use client";

import { GridList, GridListItem } from "react-aria-components";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { CategoryPills } from "@/components/ui/category-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryIcon } from "@/lib/category-icons";
import { useState, useMemo } from "react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
};

type DatasetGridProps = {
  templates: Template[];
  areaId: string;
};

/**
 * Grid component for displaying and filtering dataset templates
 * @param templates - Array of template objects to display
 * @param areaId - ID of the area for template links
 * @example
 * <DatasetGrid
 *   templates={templates}
 *   areaId="12345"
 * />
 */
export function DatasetGrid({ templates, areaId }: DatasetGridProps) {
  const t = useTranslations("AreaPage");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    return templates.reduce((acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, Template[]>);
  }, [templates]);

  // Get all available categories
  const categories = useMemo(() => {
    return Object.keys(templatesByCategory).sort();
  }, [templatesByCategory]);

  // Get category counts for pills
  const categoryCounts = useMemo(() => {
    return Object.keys(templatesByCategory).reduce((acc, category) => {
      acc[category] = templatesByCategory[category].length;
      return acc;
    }, {} as Record<string, number>);
  }, [templatesByCategory]);

  // Filter templates based on selected category and search term
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (template) => template.category === selectedCategory
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchLower) ||
          template.description?.toLowerCase().includes(searchLower) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchLower))
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {t("availableDatasets")}
        </h2>
        <p className="text-gray-600">{t("chooseDatasetDescription")}</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search datasets..."
        />

        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categoryCounts={categoryCounts}
          totalCount={templates.length}
        />
      </div>

      {/* Results */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          type="no-results"
          title="No datasets found"
          description="Try adjusting your search term or selecting a different category."
        />
      ) : (
        <GridList
          items={filteredTemplates}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="template-grid"
        >
          {(template) => (
            <GridListItem key={template.id} className="group h-full">
              <Card
                href={`/area/${areaId}/template/${template.id}`}
                description={template.description || undefined}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-olive-100 text-olive-600 rounded-lg">
                      {getCategoryIcon(template.category)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-olive-700">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {template.category}
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
  );
}
