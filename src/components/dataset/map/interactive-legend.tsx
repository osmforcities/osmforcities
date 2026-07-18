"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "react-aria-components";

/** One toggleable row of the active view. */
export type LegendCategory = {
  id: string;
  label: string;
  color: string;
  count: number;
};

/** One entry of the header view dropdown. */
export type LegendViewOption = {
  id: string;
  label: string;
};

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
 * (age / curated tag themes) and one show/hide checkbox per category.
 * Fully controlled; state lives in the map container. Epic #184.
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
  const activeView = views.find((v) => v.id === activeViewId);

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm w-56">
      {views.length > 1 ? (
        <select
          aria-label={t("legendViewLabel")}
          value={activeViewId}
          onChange={(e) => onViewChange(e.target.value)}
          className="w-full mb-2 px-2 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
        >
          {views.map((view) => (
            <option key={view.id} value={view.id}>
              {view.label}
            </option>
          ))}
        </select>
      ) : (
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          {activeView?.label}
        </h4>
      )}

      <div className="space-y-1">
        {categories.map((category) => {
          const hidden = hiddenIds.has(category.id);
          return (
            <Checkbox
              key={category.id}
              isSelected={!hidden}
              onChange={() => onToggle(category.id)}
              className={({ isFocusVisible }) =>
                `flex items-center gap-2 w-full text-xs rounded-sm px-1 py-0.5 cursor-pointer transition-opacity ${
                  hidden ? "opacity-45" : ""
                } ${isFocusVisible ? "ring-2 ring-olive-500" : "hover:bg-gray-50"}`
              }
            >
              <span
                aria-hidden="true"
                className={`w-3 h-3 rounded-sm border shrink-0 ${
                  hidden ? "bg-transparent" : ""
                }`}
                style={hidden ? undefined : { backgroundColor: category.color }}
              />
              <span className={`flex-1 truncate text-gray-700 ${hidden ? "line-through" : ""}`}>
                {category.label}
              </span>
              <span className="text-gray-400 tabular-nums">
                {category.count.toLocaleString()}
              </span>
            </Checkbox>
          );
        })}
      </div>
    </div>
  );
}
