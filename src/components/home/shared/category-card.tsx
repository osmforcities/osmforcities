import { LucideIcon } from "lucide-react";
import { ColorVariant, getColorClasses, DEFAULT_COLORS } from "./colors";

interface CategoryCardProps {
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  variant?: "default" | "showcase" | "compact";
  colorVariant?: ColorVariant;
}

export function CategoryCard({
  icon: Icon,
  category,
  title,
  description,
  variant = "default",
  colorVariant,
}: CategoryCardProps) {
  const colors = colorVariant ? getColorClasses(colorVariant) : null;

  if (variant === "showcase") {
    return (
      <div className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group hover:shadow-lg transition-shadow duration-200">
        <div
          className={`${colors?.bg || DEFAULT_COLORS.bg} ${colors?.bgHover || DEFAULT_COLORS.bgHover} p-6 transition-colors`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`${colors?.bg || DEFAULT_COLORS.bg} rounded-lg p-3 ${colors?.bgHover || DEFAULT_COLORS.bgHover} transition-colors`}
            >
              <Icon className={`size-6 ${colors?.icon || DEFAULT_COLORS.icon}`} />
            </div>
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {category}
            </span>
          </div>
        </div>

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

  if (variant === "compact") {
    return (
      <div className="flex gap-4 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg transition-shadow duration-200 group">
        <div className="flex-shrink-0">
          <div
            className={`${colors?.bg || DEFAULT_COLORS.bg} ${colors?.bgHover || DEFAULT_COLORS.bgHover} rounded-lg p-3 transition-colors`}
          >
            <Icon className={`size-6 ${colors?.icon || DEFAULT_COLORS.icon}`} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {category}
            </span>
          </div>
          <h3 className="text-lg font-bold md:text-xl text-black dark:text-white mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`${colors?.bg || DEFAULT_COLORS.bg} rounded-lg p-3 ${colors?.bgHover || DEFAULT_COLORS.bgHover} transition-colors`}
          >
            <Icon className={`size-6 ${colors?.icon || DEFAULT_COLORS.icon}`} />
          </div>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {category}
          </span>
        </div>
      </div>

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
