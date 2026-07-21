import { useTranslations } from "next-intl";
import { AGE_COLORS } from "./layers/map-style";

const AGE_LEGEND_ITEMS = [
  { key: "recent", color: AGE_COLORS.recent, labelKey: "recentChanges" },
  { key: "medium", color: AGE_COLORS.medium, labelKey: "mediumChanges" },
  { key: "older", color: AGE_COLORS.older, labelKey: "olderChanges" },
  { key: "very-old", color: AGE_COLORS["very-old"], labelKey: "veryOldChanges" },
] as const;

/**
 * Static, non-interactive compact age legend for low-interaction contexts
 * (homepage featured card). The dataset page uses InteractiveLegend instead.
 */
export function AgeLegendCompact() {
  const t = useTranslations("DatasetMap");

  return (
    <div className="bg-white/90 border rounded-lg px-2.5 py-1.5 shadow-sm">
      <span className="block text-xs font-medium text-gray-900 mb-1">
        {t("lastEditedLegend")}
      </span>
      <div className="space-y-0.5">
        {AGE_LEGEND_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm border"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700">{t(item.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
