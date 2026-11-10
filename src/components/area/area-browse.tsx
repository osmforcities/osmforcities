"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "react-aria-components";
import { BreadcrumbNav, type BreadcrumbItem } from "@/components/ui/breadcrumb-nav";
import { EmptyState } from "@/components/ui/empty-state";
import type { AreaTemplate } from "@/lib/area-templates";
import { useCategoryLabel } from "@/lib/category-label";
import { createTemplateSearch } from "@/lib/template-search";
import { CategoryNav } from "./category-nav";
import { DatasetCards, DatasetCardsSkeleton } from "./dataset-cards";
import { DatasetSearchField } from "./dataset-search-field";
import { TopicNav } from "./topic-nav";

type AreaBrowseProps = {
  areaId: string;
  areaName: string;
  /** Places above the area, never the area itself. */
  parentBreadcrumb: BreadcrumbItem[];
  facts?: ReactNode;
  flag?: ReactNode;
  templates: AreaTemplate[];
  children: ReactNode;
};

/** In the layout so the pickers and the search stay mounted across picker clicks. */
export function AreaBrowse({
  areaId,
  areaName,
  parentBreadcrumb,
  facts,
  flag,
  templates,
  children,
}: AreaBrowseProps) {
  const t = useTranslations("AreaPage");
  const { slug: topicSlug, category } = useParams<{ slug?: string; category?: string[] }>();
  const searchParams = useSearchParams();
  // Read once: replaceState never adds history entries, and Back from a dataset remounts the layout
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const categoryLabel = useCategoryLabel();
  const searchTemplates = useMemo(
    () => createTemplateSearch(templates, categoryLabel),
    [templates, categoryLabel]
  );
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery !== "";
  const results = isSearching ? searchTemplates(trimmedQuery) : [];

  const changeQuery = (value: string) => {
    setQuery(value);
    // Native replaceState keeps Next's router in sync without a server round trip per keystroke
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };

  const browseHeading = topicSlug ? t("datasetsTitle") : t("commonDatasets");

  return (
    <AreaFrame>
      <header className="mb-2 flex flex-col gap-4 lg:mb-4">
        <BreadcrumbNav items={parentBreadcrumb} />
        <div className="flex justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl">
              {areaName}
            </h1>
            {facts}
          </div>
          {flag}
        </div>
      </header>
      <DatasetSearchField
        label={t("searchLabel", { area: areaName })}
        value={query}
        onChange={changeQuery}
      />
      {!isSearching && (
        <>
          <TopicNav templates={templates} areaId={areaId} activeTopicSlug={topicSlug} />
          {topicSlug && (
            <CategoryNav
              templates={templates}
              areaId={areaId}
              topicSlug={topicSlug}
              activeCategorySlug={category?.[0]}
            />
          )}
        </>
      )}
      <section aria-labelledby="datasets-heading" className="mt-2 flex flex-col gap-3">
        <h2
          id="datasets-heading"
          aria-live={isSearching ? "polite" : undefined}
          className="text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          {isSearching
            ? t("searchResults", { count: results.length, query: trimmedQuery })
            : browseHeading}
        </h2>
        {isSearching ? (
          <SearchResults
            results={results}
            areaId={areaId}
            query={trimmedQuery}
            onClear={() => changeQuery("")}
          />
        ) : (
          children
        )}
      </section>
    </AreaFrame>
  );
}

type SearchResultsProps = {
  results: AreaTemplate[];
  areaId: string;
  query: string;
  onClear: () => void;
};

function SearchResults({ results, areaId, query, onClear }: SearchResultsProps) {
  const t = useTranslations("AreaPage");

  if (results.length > 0) return <DatasetCards templates={results} areaId={areaId} />;

  return (
    <div className="flex flex-col items-center">
      <EmptyState
        type="no-results"
        title={t("noSearchResults", { query })}
        description={t("noSearchResultsHint")}
      />
      <Button
        onPress={onClear}
        className="min-h-12 rounded-lg border border-gray-300 bg-white px-4 font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500"
      >
        {t("clearSearch")}
      </Button>
    </div>
  );
}

export function AreaBrowseSkeleton() {
  return (
    <AreaFrame>
      <div aria-busy className="mb-2 flex flex-col gap-4 lg:mb-4">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-64 animate-pulse rounded bg-gray-200 lg:h-12" />
      </div>
      <DatasetCardsSkeleton />
    </AreaFrame>
  );
}

function AreaFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh_-_var(--nav-height))] bg-gray-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-12 sm:px-6 lg:pt-8">
        {children}
      </div>
    </div>
  );
}
