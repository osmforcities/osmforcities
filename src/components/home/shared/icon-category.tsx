import { LucideIcon } from "lucide-react";

interface IconCategoryProps {
  icon: LucideIcon;
  category: string;
  size?: "sm" | "md" | "lg";
}

export function IconCategory({
  icon: Icon,
  category,
  size = "md",
}: IconCategoryProps) {
  const iconSizes = {
    sm: "size-5",
    md: "size-6",
    lg: "size-8",
  };

  const containerSizes = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`bg-blue-50 dark:bg-blue-950 rounded-lg ${containerSizes[size]}`}
      >
        <Icon className={`${iconSizes[size]} text-blue-600`} />
      </div>
      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
        {category}
      </span>
    </div>
  );
}
