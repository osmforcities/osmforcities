import { getCategoryIcon } from "@/lib/category-icons";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type CategoryCardsProps = {
  categories: Category[];
  areaId: string;
  areaName: string;
};

/**
 * "Find data in {area}" navigation. A complete browse surface: every leaf
 * category with templates, as homepage-style cards (olive icon tile + label).
 * This is a gateway to the catalog — what's actually available in the area
 * depends on local OpenStreetMap mapping, hence the subtitle caveat.
 */
export function CategoryCards({ categories, areaId, areaName }: CategoryCardsProps) {
  const t = useTranslations("CategoryCards");
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          {t("title", { area: areaName })}
        </h2>
        <p className="text-xs text-neutral-400 mt-1">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/area/${areaId}/templates?category=${category.slug}`}
            aria-label={category.name}
            className="flex items-center gap-4 border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-neutral-900 hover:border-olive-300 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-olive-400"
          >
            <div className="flex-shrink-0">
              <div className="bg-olive-100 dark:bg-olive-700 rounded-lg p-3 text-olive-500 dark:text-olive-300">
                {getCategoryIcon(category.name)}
              </div>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
