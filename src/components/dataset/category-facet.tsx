"use client";

import { useTranslations } from "next-intl";
import type { Dataset } from "@/schemas/dataset";
import { Link } from "@/i18n/navigation";

type CategoryFacetProps = {
  dataset: Dataset;
  areaName: string;
};

const chipClasses =
  "inline-flex flex-none items-center rounded-full border border-olive-100 bg-olive-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-olive-700";

/**
 * The dataset's category as an olive chip. When the template has a category it
 * links to the area's browse grid pre-filtered to that category
 * (`/area/<id>?category=<slug>`), with an accessible label. Uncategorized
 * templates fall back to a static "Other" chip (no link).
 */
export function CategoryFacet({ dataset, areaName }: CategoryFacetProps) {
  const t = useTranslations("DatasetPage");
  const category = dataset.template.category;

  if (!category) {
    return <span className={chipClasses}>{t("categoryUncategorized")}</span>;
  }

  return (
    <Link
      href={`/area/${dataset.area.id}?category=${encodeURIComponent(category.slug)}`}
      aria-label={t("categoryFacetLabel", {
        category: category.name,
        area: areaName,
      })}
      className={`${chipClasses} transition-colors hover:border-olive-200 hover:bg-olive-100 hover:text-olive-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500`}
    >
      {category.name}
    </Link>
  );
}
