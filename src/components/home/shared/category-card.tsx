import { LucideIcon } from "lucide-react";
import { IconWrapper } from "./icon-wrapper";

interface CategoryCardProps {
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  variant?: "default" | "showcase";
}

export function CategoryCard({
  icon: Icon,
  category,
  title,
  description,
  variant = "default"
}: CategoryCardProps) {
  if (variant === "showcase") {
    return (
      <div className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group hover:shadow-lg transition-shadow duration-200">
        {/* Icon header */}
        <div className="bg-gray-50 dark:bg-gray-950 p-6">
          <div className="flex items-center gap-3">
            <IconWrapper icon={Icon} />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="space-y-3">
            <h3 className="text-xl font-bold md:text-2xl text-black dark:text-white">
              {title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Icon and category */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <IconWrapper icon={Icon} />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {category}
          </span>
        </div>
      </div>

      {/* Title and description */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold md:text-2xl text-black dark:text-white">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}