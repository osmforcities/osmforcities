"use client";

import { useTranslations } from "next-intl";
import type { AreaSearchResult as AreaSearchResultData } from "@/lib/area-search";
import { getAreaCharacteristics } from "@/lib/utils";
import type { MessageResolver } from "@/lib/tag-i18n";

/** Row content for one area in the search dropdown. */
export function AreaSearchResult({ area }: { area: AreaSearchResultData }) {
  const t = useTranslations("NavSearch");
  // Nominatim address types are resolved dynamically (from OSM data), which
  // cannot be checked against next-intl's literal message-key types.
  const translateAddressType = useTranslations(
    "AddressTypes"
  ) as unknown as MessageResolver;

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">
          {area.name}
        </p>
        {area.parents.length > 0 && (
          <p className="text-xs text-gray-600 mt-1" data-testid="area-parents">
            {area.parents.join(", ")}
          </p>
        )}
        {area.population !== null && (
          <p className="text-xs text-gray-500 mt-1" data-testid="area-population">
            {t("population", { count: area.population })}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 ml-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-olive-100 text-olive-800">
          {getAreaCharacteristics(area, translateAddressType)[0]}
        </span>
      </div>
    </div>
  );
}
