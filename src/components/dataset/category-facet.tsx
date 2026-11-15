"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCategoryLabel } from "@/lib/category-label";

type CategoryFacetProps = {
  category: { slug: string } | null | undefined;
  areaName: string;
  categoryHref: string;
};

const chipClasses =
  "inline-flex flex-none items-center rounded-full border border-olive-100 bg-olive-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-olive-700";

/**
 * The dataset's category as an olive chip. When the template has a category it
 * links to the area's browse page for that category, with an accessible label.
 * Uncategorized templates fall back to a static "Other" chip (no link).
 */
export function CategoryFacet({ category, areaName, categoryHref }: CategoryFacetProps) {
  const t = useTranslations("DatasetPage");
  const categoryLabel = useCategoryLabel();

  if (!category) {
    return <span className={chipClasses}>{t("categoryUncategorized")}</span>;
  }

  return (
    <Link
      href={categoryHref}
      aria-label={t("categoryFacetLabel", {
        category: categoryLabel(category.slug),
        area: areaName,
      })}
      className={`${chipClasses} transition-colors hover:border-olive-200 hover:bg-olive-100 hover:text-olive-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500`}
    >
      {categoryLabel(category.slug)}
    </Link>
  );
}
