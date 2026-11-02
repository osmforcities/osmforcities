"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AreaTemplate } from "@/lib/area-templates";
import { cn } from "@/lib/utils";
import { useTopics } from "./use-topics";

// On phones the strip scrolls sideways and the active topic can start off-screen
function scrollIntoStrip(chip: HTMLAnchorElement | null) {
  chip?.scrollIntoView({ block: "nearest", inline: "center" });
}

type TopicNavProps = {
  templates: AreaTemplate[];
  areaId: string;
  activeTopicSlug: string;
};

export function TopicNav({ templates, areaId, activeTopicSlug }: TopicNavProps) {
  const t = useTranslations("AreaPage");
  const topics = useTopics(templates);

  return (
    <nav aria-label={t("topics")}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {topics.map((topic) => {
          const isActive = topic.slug === activeTopicSlug;
          return (
            <li key={topic.slug} className="shrink-0">
              <Link
                ref={isActive ? scrollIntoStrip : undefined}
                href={`/area/${areaId}/topics/${topic.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500 sm:min-h-9",
                  isActive
                    ? "border-olive-700 bg-olive-700 text-white"
                    : "border-gray-300 bg-white text-gray-800 hover:border-olive-300 hover:bg-olive-50"
                )}
              >
                {topic.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
