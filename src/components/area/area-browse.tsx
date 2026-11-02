"use client";

import type { ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  Disclosure,
  DisclosurePanel,
  Input,
  SearchField,
} from "react-aria-components";
import { ListTree, Search, X } from "lucide-react";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { EmptyState } from "@/components/ui/empty-state";
import type { AreaDataType } from "@/lib/area-templates";
import { matchesSearch } from "@/lib/template-topics";
import { useCategoryLabel } from "@/lib/category-label";
import { TemplateCard } from "./template-card";
import { TopicNav } from "./topic-nav";

type BreadcrumbItem = { label: string; href?: string };

type AreaBrowseProps = {
  areaId: string;
  areaName: string;
  hubBreadcrumb: BreadcrumbItem[];
  templates: AreaDataType[];
  children: ReactNode;
};

/**
 * Shared frame of the area hub and its topic pages. Lives in the layout so the
 * header and Topics sidebar stay mounted across topic clicks.
 */
export function AreaBrowse({
  areaId,
  areaName,
  hubBreadcrumb,
  templates,
  children,
}: AreaBrowseProps) {
  const t = useTranslations("AreaPage");
  const navT = useTranslations("Navigation");
  const categoryLabel = useCategoryLabel();
  const { slug: topicSlug } = useParams<{ slug?: string }>();
  const query = useSearchParams().get("q") ?? "";

  const topicLabel = topicSlug ? categoryLabel(topicSlug) : undefined;
  const searchableTemplates = topicSlug
    ? templates.filter((template) => template.topicSlug === topicSlug)
    : templates;

  // Plain replaceState keeps typing client-side; router.replace would re-render
  // the server page on every keystroke. Next.js syncs useSearchParams with it.
  const setQuery = (nextQuery: string) => {
    const url = new URL(window.location.href);
    if (nextQuery) url.searchParams.set("q", nextQuery);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };

  const breadcrumb = topicLabel
    ? [
        { label: navT("home"), href: "/" },
        { label: areaName, href: `/area/${areaId}` },
        { label: topicLabel },
      ]
    : hubBreadcrumb;

  return (
    <div className="min-h-full bg-gray-50">
      <Disclosure className="mx-auto w-full max-w-7xl px-4 pt-6 pb-6 sm:px-6 lg:pt-8">
        <BreadcrumbNav items={breadcrumb} />
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl">
              {topicLabel ?? areaName}
              {topicLabel && (
                <span className="ml-2 font-normal text-gray-500">
                  {searchableTemplates.length}
                </span>
              )}
            </h1>
            {topicSlug && (
              <Button
                slot="trigger"
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-800 focus-visible:outline-2 focus-visible:outline-olive-500 lg:hidden"
              >
                <ListTree className="h-4 w-4" aria-hidden />
                {t("topics")}
              </Button>
            )}
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            aria-label={t("searchLabel")}
            className="group relative w-full lg:w-[420px]"
          >
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              aria-hidden
            />
            <Input
              placeholder={
                topicLabel
                  ? t("searchInTopic", { topic: topicLabel })
                  : t("searchAll", { count: String(templates.length) })
              }
              className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-11 text-base text-gray-900 placeholder:text-gray-500 focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500 lg:h-11 lg:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            <Button
              aria-label={t("clearSearch")}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:text-gray-800 group-data-[empty]:hidden"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </SearchField>
        </div>
        {topicSlug && (
          <DisclosurePanel className="mt-4 lg:hidden">
            <TopicNav
              templates={templates}
              areaId={areaId}
              activeTopicSlug={topicSlug}
              variant="rows"
            />
          </DisclosurePanel>
        )}
      </Disclosure>

      <div className="mx-auto flex w-full max-w-7xl gap-10 px-4 pb-12 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-[calc(var(--nav-height)+1.5rem)]">
            <h2 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("topics")}
            </h2>
            <TopicNav
              templates={templates}
              areaId={areaId}
              activeTopicSlug={topicSlug}
              variant="sidebar"
            />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          {query.trim() ? (
            <SearchResults
              templates={searchableTemplates}
              areaId={areaId}
              query={query}
              onBackToCommon={topicSlug ? undefined : () => setQuery("")}
            />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

function SearchResults({
  templates,
  areaId,
  query,
  onBackToCommon,
}: {
  templates: AreaDataType[];
  areaId: string;
  query: string;
  onBackToCommon?: () => void;
}) {
  const t = useTranslations("AreaPage");
  const categoryLabel = useCategoryLabel();
  const results = templates.filter((template) => matchesSearch(template, query));

  const topicPath = (template: AreaDataType) =>
    template.categorySlug === template.topicSlug
      ? categoryLabel(template.topicSlug)
      : `${categoryLabel(template.topicSlug)} · ${categoryLabel(template.categorySlug)}`;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900" aria-live="polite">
          {t("searchResults", { count: results.length, query: query.trim() })}
        </h2>
        {onBackToCommon && (
          <Button
            onPress={onBackToCommon}
            className="min-h-11 text-sm font-medium text-olive-700 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
          >
            {t("backToCommon")}
          </Button>
        )}
      </div>
      {results.length === 0 ? (
        <EmptyState
          type="no-results"
          title={t("noResults")}
          description={t("noResultsDescription")}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {results.map((template) => (
            <li key={template.id}>
              <TemplateCard
                template={template}
                areaId={areaId}
                topicPath={topicPath(template)}
                phoneLayout="row"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
