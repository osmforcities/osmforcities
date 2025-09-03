import { useTranslations } from "next-intl";

const AGE_LEGEND_ITEMS = [
  { key: "recent", color: "#22c55e", labelKey: "recentChanges" },
  { key: "medium", color: "#f97316", labelKey: "mediumChanges" },
  { key: "older", color: "#eab308", labelKey: "olderChanges" },
  { key: "very-old", color: "#6b7280", labelKey: "veryOldChanges" },
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
