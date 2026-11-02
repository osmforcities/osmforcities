"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AreaTemplate } from "@/lib/area-templates";
import { groupTopicByCategory } from "@/lib/template-topics";
import { cn } from "@/lib/utils";
import { useCategoryGroupLabel, useTopics } from "./use-topics";

type TopicNavProps = {
  templates: AreaTemplate[];
  areaId: string;
  activeTopicSlug?: string;
  variant: "sidebar" | "rows";
};

export function TopicNav({ templates, areaId, activeTopicSlug, variant }: TopicNavProps) {
  const t = useTranslations("AreaPage");
  const topics = useTopics(templates);

  return (
    <nav
      aria-label={t("topics")}
      className={cn(
        "flex flex-col",
        variant === "rows" &&
          "overflow-hidden rounded-xl border border-gray-200 bg-white"
      )}
    >
      {topics.map((topic) => {
        const isActive = topic.slug === activeTopicSlug;
        return (
          <div key={topic.slug} className="flex flex-col">
            <Link
              href={`/area/${areaId}/topics/${topic.slug}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 text-gray-800 focus-visible:outline-2 focus-visible:outline-olive-500",
                variant === "sidebar"
                  ? "min-h-10 rounded-lg px-3 text-sm hover:bg-gray-100"
                  : "min-h-[52px] border-b border-gray-100 px-4 last:border-b-0 hover:bg-olive-50",
                isActive && "bg-olive-100 font-semibold text-olive-800 hover:bg-olive-100"
              )}
            >
              <span>{topic.label}</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                {topic.count}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
            {isActive && variant === "sidebar" && (
              <CategoryAnchors templates={templates} topicSlug={topic.slug} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function CategoryAnchors({
  templates,
  topicSlug,
}: {
  templates: AreaTemplate[];
  topicSlug: string;
}) {
  const groupLabel = useCategoryGroupLabel(topicSlug);
  return (
    <ul className="my-1 ml-5 flex flex-col border-l border-gray-300 py-1 pl-2">
      {groupTopicByCategory(templates, topicSlug).map(({ categorySlug }) => (
        <li key={categorySlug}>
          <a
            href={`#${categorySlug}`}
            className="flex min-h-8 items-center rounded px-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            {groupLabel(categorySlug)}
          </a>
        </li>
      ))}
    </ul>
  );
}
