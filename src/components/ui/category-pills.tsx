import { getCategoryIcon } from "@/lib/category-icons";

type CategoryPillsProps = {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
};

/**
 * Category filter pills with icons and counts
 * @param categories - Array of category names
 * @param selectedCategory - Currently selected category ("all" for all categories)
 * @param onCategoryChange - Callback when category selection changes
 * @param categoryCounts - Object mapping category names to their counts
 * @param totalCount - Total count for "All" pill
 * @example
 * <CategoryPills
 *   categories={["education", "healthcare"]}
 *   selectedCategory="education"
 *   onCategoryChange={setCategory}
 *   categoryCounts={{ education: 5, healthcare: 3 }}
 *   totalCount={8}
 * />
 */
export function CategoryPills({
  categories,
  selectedCategory,
  onCategoryChange,
  categoryCounts,
  totalCount,
}: CategoryPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onCategoryChange("all")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selectedCategory === "all"
            ? "bg-olive-100 text-olive-700 border border-olive-200"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
        }`}
      >
        {`All (${totalCount})`}
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategory === category
              ? "bg-olive-100 text-olive-700 border border-olive-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
        >
          <div className="w-4 h-4">{getCategoryIcon(category)}</div>
          <span className="capitalize">{category}</span>
          <span className="text-xs opacity-75">
            {`(${categoryCounts[category]})`}
          </span>
        </button>
      ))}
    </div>
  );
}
