import { useTranslations } from "next-intl";
import { AGE_COLORS } from "./layers/map-style";

const AGE_LEGEND_ITEMS = [
  { key: "recent", color: AGE_COLORS.recent, labelKey: "recentChanges" },
  { key: "medium", color: AGE_COLORS.medium, labelKey: "mediumChanges" },
  { key: "older", color: AGE_COLORS.older, labelKey: "olderChanges" },
  { key: "very-old", color: AGE_COLORS["very-old"], labelKey: "veryOldChanges" },
] as const;

export function AgeLegend() {
  const t = useTranslations("DatasetMap");

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm">
      <h4 className="text-sm font-medium text-gray-900 mb-2">
        {t("lastEditedLegend")}
      </h4>
      <div className="space-y-2">
        {AGE_LEGEND_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700">{t(item.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
