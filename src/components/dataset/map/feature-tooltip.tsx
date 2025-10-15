import { useTranslations } from "next-intl";
import type { Feature } from "geojson";

type FeatureTooltipProps = {
  feature: Feature;
};

export function FeatureTooltip({ feature }: FeatureTooltipProps) {
  const t = useTranslations("DatasetMap");
  const properties = feature.properties || {};

  // Separate OSM tags from metadata, excluding the age property
  const tags: Record<string, string> = {};
  const meta: Record<string, string> = {};

  Object.entries(properties).forEach(([key, value]) => {
    // Skip the age property as it's internal metadata
    if (key === "age") return;

    if (key.startsWith("@")) {
      // OSM metadata starts with @
      meta[key.slice(1)] = String(value);
    } else {
      // Regular OSM tags
      tags[key] = String(value);
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border max-w-sm">
      {Object.keys(tags).length > 0 && (
        <div className="mb-3">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
            {t("tags")}
          </h4>
          <div className="space-y-1">
            {Object.entries(tags).map(([key, value]) => (
              <div key={key} className="flex text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-300 mr-2 min-w-0 truncate">
                  {key}
                  {t("colon")}
                </span>
                <span className="text-gray-800 dark:text-gray-200 break-all">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(meta).length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
            {t("meta")}
          </h4>
          <div className="space-y-1">
            {Object.entries(meta).map(([key, value]) => (
              <div key={key} className="flex text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-300 mr-2 min-w-0 truncate">
                  {key}
                  {t("colon")}
                </span>
                <span className="text-gray-800 dark:text-gray-200 break-all">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(tags).length === 0 && Object.keys(meta).length === 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t("noAdditionalInfo")}
        </div>
      )}
    </div>
  );
}
