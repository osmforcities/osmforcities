"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import type { AreaTemplate } from "@/lib/area-templates";
import { CategoryNav } from "./category-nav";
import { TopicNav } from "./topic-nav";

type BreadcrumbItem = { label: string; href?: string };

type AreaBrowseProps = {
  areaId: string;
  areaName: string;
  /** Places above the area, never the area itself. */
  parentBreadcrumb: BreadcrumbItem[];
  templates: AreaTemplate[];
  children: ReactNode;
};

/** In the layout so the pickers stay mounted across picker clicks. */
export function AreaBrowse({
  areaId,
  areaName,
  parentBreadcrumb,
  templates,
  children,
}: AreaBrowseProps) {
  const t = useTranslations("AreaPage");
  const { slug: topicSlug, category } = useParams<{ slug?: string; category?: string[] }>();

  return (
    <div className="min-h-[calc(100dvh_-_var(--nav-height))] bg-gray-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-12 sm:px-6 lg:pt-8">
        <header className="flex flex-col gap-4">
          <BreadcrumbNav items={parentBreadcrumb} />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl">
            {areaName}
          </h1>
        </header>
        <TopicNav templates={templates} areaId={areaId} activeTopicSlug={topicSlug} />
        {topicSlug && (
          <CategoryNav
            templates={templates}
            areaId={areaId}
            topicSlug={topicSlug}
            activeCategorySlug={category?.[0]}
          />
        )}
        <section aria-labelledby="datasets-heading" className="mt-2 flex flex-col gap-3">
          <h2
            id="datasets-heading"
            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            {topicSlug ? t("datasetsTitle") : t("commonDatasets")}
          </h2>
          {children}
        </section>
      </div>
    </div>
  );
}
