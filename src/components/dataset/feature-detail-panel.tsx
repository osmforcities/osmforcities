"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Feature } from "geojson";

type FeatureDetailPanelProps = {
  feature: Feature;
  activeField?: string;
  onBack: () => void;
};

const INTERNAL_KEYS = new Set(["ageCategory"]);

export function FeatureDetailPanel({
  feature,
  activeField,
  onBack,
}: FeatureDetailPanelProps) {
  const t = useTranslations("DatasetMap");
  const properties = feature.properties || {};

  // osmtogeojson outputs a combined "id" field like "node/12345" or "way/67890"
  const osmFeatureId = properties["id"];
  const [osmType, osmId] =
    typeof osmFeatureId === "string" && osmFeatureId.includes("/")
      ? osmFeatureId.split("/")
      : [undefined, undefined];

  let name: string | undefined;
  const displayTags: [string, string][] = [];
  Object.entries(properties).forEach(([key, value]) => {
    if (key === "id" || key.startsWith("@") || INTERNAL_KEYS.has(key)) return;
    if (key === "name") { name = String(value); return; }
    displayTags.push([key, String(value)]);
  });
  const osmUrl =
    osmType && osmId
      ? `https://www.openstreetmap.org/${osmType}/${osmId}`
      : null;

  return (
    <div className="flex flex-col h-full" data-testid="feature-detail-panel">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 -ml-1 self-start"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </button>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          {name ? (
            <h2 className="text-base font-semibold text-gray-900">{name}</h2>
          ) : (
            <h2 className="text-base font-medium text-gray-400 italic">
              {osmType && osmId ? `${osmType}/${osmId}` : t("noAdditionalInfo")}
            </h2>
          )}
          {activeField && (
            <span className="inline-flex mt-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
              {activeField}
            </span>
          )}
        </div>

        {/* OSM tags */}
        {displayTags.length > 0 && (
          <div className="space-y-1.5">
            {displayTags.map(([key, value]) => (
              <div key={key} className="flex gap-2 text-sm leading-snug">
                <span className="font-medium text-gray-500 shrink-0 min-w-0">
                  {key}
                </span>
                <span className="text-gray-800 break-all">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OSM link */}
      {osmUrl && (
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
        >
          {t("openInOsm")}
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}
