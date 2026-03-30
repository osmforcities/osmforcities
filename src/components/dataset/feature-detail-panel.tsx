"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Feature } from "geojson";

type FeatureDetailPanelProps = {
  feature: Feature;
  activeField?: string;
  onBack: () => void;
};

export function FeatureDetailPanel({
  feature,
  activeField,
  onBack,
}: FeatureDetailPanelProps) {
  const t = useTranslations("DatasetMap");
  const properties = feature.properties || {};

  const tags: Record<string, string> = {};
  const osmType = properties["@type"] as string | undefined;
  const osmId = properties["@id"] as string | undefined;

  Object.entries(properties).forEach(([key, value]) => {
    if (key === "age") return;
    if (!key.startsWith("@")) {
      tags[key] = String(value);
    }
  });

  const name = tags["name"];
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

      {name && (
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{name}</h2>
      )}

      {activeField && (
        <span className="inline-flex self-start text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 mb-4">
          {activeField}
        </span>
      )}

      {Object.keys(tags).length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {Object.entries(tags).map(([key, value]) => (
            <div key={key} className="flex text-sm gap-2">
              <span className="font-medium text-gray-500 shrink-0">{key}</span>
              <span className="text-gray-800 break-all">{value}</span>
            </div>
          ))}
        </div>
      )}

      {osmUrl && (
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg mt-auto"
        >
          {t("openInOsm")}
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}
