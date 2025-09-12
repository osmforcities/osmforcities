import { Search, FileX } from "lucide-react";

type EmptyStateProps = {
  type: "no-data" | "no-results";
  title: string;
  description: string;
  icon?: React.ReactNode;
};

/**
 * Standardized empty state component
 * @param type - Type of empty state ("no-data" for no data available, "no-results" for filtered results)
 * @param title - Main heading text
 * @param description - Descriptive text below title
 * @param icon - Optional custom icon (uses default icons if not provided)
 * @example
 * <EmptyState
 *   type="no-data"
 *   title="No datasets available"
 *   description="There are currently no datasets for this area."
 * />
 */
export function EmptyState({
  type,
  title,
  description,
  icon,
}: EmptyStateProps) {
  const defaultIcon =
    type === "no-data" ? (
      <FileX className="w-16 h-16 text-gray-300 mb-4" />
    ) : (
      <Search className="w-12 h-12 text-gray-300 mb-3" />
    );

  const iconToShow = icon || defaultIcon;
  const containerClass = type === "no-data" ? "py-12" : "py-8";

  return (
    <div className={`text-center ${containerClass}`}>
      <div className="flex flex-col items-center justify-center">
        {iconToShow}
        <h3
          className={`font-semibold text-gray-900 mb-2 ${
            type === "no-data" ? "text-xl" : "text-lg"
          }`}
        >
          {title}
        </h3>
        <p className="text-gray-600 max-w-md">{description}</p>
      </div>
    </div>
  );
}
