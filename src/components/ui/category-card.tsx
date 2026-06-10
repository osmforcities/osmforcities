import { LucideIcon } from "lucide-react";
import { Heading } from "./heading";

interface CategoryCardProps {
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  variant?: "default" | "showcase" | "compact";
}

export function CategoryCard({
  icon: Icon,
  category,
  title,
  description,
  variant = "default",
}: CategoryCardProps) {
  if (variant === "showcase") {
    return (
      <div className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="bg-olive-100 dark:bg-olive-700 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-olive-200 dark:bg-olive-600 rounded-lg p-3">
              <Icon className="size-6 text-olive-500 dark:text-olive-300" />
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
      <div className="flex gap-4 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div className="flex-shrink-0">
          <div className="bg-olive-100 dark:bg-olive-700 rounded-lg p-3">
            <Icon className="size-6 text-olive-500" />
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
    <div className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-olive-100 dark:bg-olive-700 rounded-lg p-3">
            <Icon className="size-6 text-olive-500" />
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
