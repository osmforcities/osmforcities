import { LucideIcon } from "lucide-react";
import { Heading } from "./heading";

export type CardColorVariant =
  | "olive"
  | "green"
  | "blue"
  | "indigo-gray"
  | "yellow"
  | "orange"
  | "purple"
  | "pink";

const DEFAULT_COLORS = {
  bg: "bg-gray-50 dark:bg-gray-950",
  bgHover: "group-hover:bg-gray-100 dark:group-hover:bg-gray-900",
  icon: "text-blue-600",
} as const;

function getColorClasses(color: CardColorVariant) {
  switch (color) {
    case "olive":
      return {
        bg: "bg-olive-100 dark:bg-olive-700",
        bgHover: "group-hover:bg-olive-200 dark:group-hover:bg-olive-600",
        icon: "text-olive-500",
      };
    case "green":
      return {
        bg: "bg-green-100 dark:bg-green-700",
        bgHover: "group-hover:bg-green-200 dark:group-hover:bg-green-600",
        icon: "text-green-500",
      };
    case "blue":
      return {
        bg: "bg-blue-100 dark:bg-blue-700",
        bgHover: "group-hover:bg-blue-200 dark:group-hover:bg-blue-600",
        icon: "text-blue-500",
      };
    case "indigo-gray":
      return {
        bg: "bg-indigo-gray-100 dark:bg-indigo-gray-700",
        bgHover:
          "group-hover:bg-indigo-gray-200 dark:group-hover:bg-indigo-gray-600",
        icon: "text-indigo-gray-500",
      };
    case "yellow":
      return {
        bg: "bg-yellow-100 dark:bg-yellow-700",
        bgHover: "group-hover:bg-yellow-200 dark:group-hover:bg-yellow-600",
        icon: "text-yellow-500",
      };
    case "orange":
      return {
        bg: "bg-orange-100 dark:bg-orange-700",
        bgHover: "group-hover:bg-orange-200 dark:group-hover:bg-orange-600",
        icon: "text-orange-500",
      };
    case "purple":
      return {
        bg: "bg-purple-100 dark:bg-purple-700",
        bgHover: "group-hover:bg-purple-200 dark:group-hover:bg-purple-600",
        icon: "text-purple-500",
      };
    case "pink":
      return {
        bg: "bg-pink-100 dark:bg-pink-700",
        bgHover: "group-hover:bg-pink-200 dark:group-hover:bg-pink-600",
        icon: "text-pink-500",
      };
  }
}

interface CategoryCardProps {
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  variant?: "default" | "showcase" | "compact";
  colorVariant?: CardColorVariant;
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
            <Heading as="h3" level="h3" spacing="sm">
              {title}
            </Heading>
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
          <Heading as="h3" level="h3-compact" spacing="none" className="mb-1">
            {title}
          </Heading>
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
        <Heading as="h3" level="h3" spacing="sm">
          {title}
        </Heading>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
