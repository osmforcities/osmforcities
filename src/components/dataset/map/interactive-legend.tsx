"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button, Checkbox } from "react-aria-components";
import { Check, ChevronUp, Layers } from "lucide-react";

/** One toggleable row of the active view. */
export type LegendCategory = {
  id: string;
  label: string;
  color: string;
  count: number;
  /** De-emphasize the label (synthetic rows like "Missing"). */
  muted?: boolean;
};

/** One entry of the header view dropdown. */
export type LegendViewOption = {
  id: string;
  label: string;
};

// Mirrors Tailwind's `sm` breakpoint: below it the card would blanket the map
const BELOW_SM_BREAKPOINT = "(max-width: 640px)";

type InteractiveLegendProps = {
  views: LegendViewOption[];
  activeViewId: string;
  categories: LegendCategory[];
  hiddenIds: ReadonlySet<string>;
  onViewChange: (viewId: string) => void;
  onToggle: (categoryId: string) => void;
};

/**
 * The map's single control: a header dropdown to switch the coloring view
 * (age / curated tag themes) and one show/hide checkbox per category. The
 * color swatch doubles as the checkbox (checkmark = visible, hollow =
 * hidden) so toggling reads as an affordance, not decoration. Collapsible;
 * starts collapsed on small screens where the card would blanket the map.
 * Fully controlled; filter state lives in the map container.
 */
export function InteractiveLegend({
  views,
  activeViewId,
  categories,
  hiddenIds,
  onViewChange,
  onToggle,
}: InteractiveLegendProps) {
  const t = useTranslations("DatasetMap");
  const locale = useLocale();
  const activeView = views.find((v) => v.id === activeViewId);

  // SSR markup must match the first client render, so the small-screen
  // default (collapsed) is applied after mount instead of at init
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (window.matchMedia(BELOW_SM_BREAKPOINT).matches) setCollapsed(true);
  }, []);

  if (collapsed) {
    return (
      <Button
        onPress={() => setCollapsed(false)}
        aria-label={t("expandLegend")}
        className={({ isFocusVisible }) =>
          `flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm text-sm font-medium text-gray-900 ${
            isFocusVisible ? "ring-2 ring-olive-500" : "hover:bg-gray-50"
          }`
        }
      >
        <Layers aria-hidden="true" className="w-4 h-4 text-gray-500" />
        {activeView?.label}
      </Button>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm w-56">
      <div className="flex items-center gap-1 mb-2">
        {views.length > 1 ? (
          <select
            aria-label={t("legendViewLabel")}
            value={activeViewId}
            onChange={(e) => onViewChange(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.label}
              </option>
            ))}
          </select>
        ) : (
          <h4 className="flex-1 text-sm font-medium text-gray-900">
            {activeView?.label}
          </h4>
        )}
        <Button
          onPress={() => setCollapsed(true)}
          aria-label={t("collapseLegend")}
          className={({ isFocusVisible }) =>
            `p-1 rounded-md text-gray-500 shrink-0 ${
              isFocusVisible ? "ring-2 ring-olive-500" : "hover:bg-gray-100"
            }`
          }
        >
          <ChevronUp aria-hidden="true" className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-0.5">
        {categories.map((category) => {
          const hidden = hiddenIds.has(category.id);
          return (
            <Checkbox
              key={category.id}
              isSelected={!hidden}
              onChange={() => onToggle(category.id)}
              className={({ isFocusVisible }) =>
                `flex items-center gap-2 w-full text-xs rounded-sm px-1 py-1.5 lg:py-1 cursor-pointer ${
                  isFocusVisible ? "ring-2 ring-olive-500" : "hover:bg-gray-50"
                }`
              }
            >
              {/* Swatch doubles as checkbox: filled + check = visible,
                  hollow color outline = hidden */}
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-sm border-2 shrink-0 flex items-center justify-center"
                style={{
                  borderColor: category.color,
                  backgroundColor: hidden ? "transparent" : category.color,
                }}
              >
                {!hidden && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </span>
              <span
                className={`flex-1 truncate ${
                  hidden
                    ? "text-gray-400"
                    : category.muted
                      ? "text-gray-500"
                      : "text-gray-700"
                }`}
              >
                {category.label}
              </span>
              <span className="text-gray-400 tabular-nums">
                {category.count.toLocaleString(locale)}
              </span>
            </Checkbox>
          );
        })}
      </div>
    </div>
  );
}
