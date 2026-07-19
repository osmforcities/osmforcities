"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Link } from "react-aria-components";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FeatureCollection } from "geojson";
import { mapStyle } from "@/lib/map-tiles";
import { getTemplateIcon } from "@/lib/category-icons";
import { calculateBbox, computeInitialViewState } from "@/lib/utils";
import type { InitialViewState } from "@/lib/utils";
import type { ProcessedDatasetStats } from "@/lib/dataset-stats";
import { DatasetStatsRow } from "@/components/ui/dataset-stats-row";
import { MapLayers } from "@/components/dataset/map/layers";
import { AoiBoundaryLayer } from "@/components/dataset/map/aoi-boundary-layer";
import { processOSMFeaturesForVisualization } from "@/lib/osm-data-processor";

function applyViewState(map: MapRef | null, viewState: InitialViewState) {
  if (!map) return;
  if ("bounds" in viewState) {
    map.fitBounds(viewState.bounds, {
      ...viewState.fitBoundsOptions,
      duration: 0,
    });
  } else {
    map.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
    });
  }
}

type FeaturedArea = {
  bounds: string | null;
  centerLat: number | null;
  centerLon: number | null;
};

type FeaturedDatasetMapClientProps = {
  datasetId: string;
  areaId: number;
  area: FeaturedArea;
  title: string;
  /** Category slug (icon fallback when the template has no icon) */
  category: string;
  /** Template slug for the template-specific icon */
  templateId: string;
  stats: ProcessedDatasetStats;
  href: string;
};

export function FeaturedDatasetMapClient({
  datasetId,
  areaId,
  area,
  title,
  category,
  templateId,
  stats,
  href,
}: FeaturedDatasetMapClientProps) {
  const t = useTranslations("Home.featuredDataset");
  const mapRef = useRef<MapRef | null>(null);
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    setGeojson(null);
    setBoundary(null);

    const controller = new AbortController();
    // Marketing page: on failure keep the basemap + card, no error UI.
    // slim returns truncated geometry + @timestamp only (no OSM tags).
    fetch(`/api/datasets/${datasetId}/geojson?slim`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FeatureCollection | null) => {
        if (data && !controller.signal.aborted) setGeojson(data);
      })
      .catch(() => {});

    fetch(`/api/areas/${areaId}/boundary`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FeatureCollection | null) => {
        if (data && !controller.signal.aborted) setBoundary(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [datasetId, areaId]);

  // Same processing as the dataset page so rendering matches it
  const processedData = useMemo(
    () => (geojson ? processOSMFeaturesForVisualization(geojson) : null),
    [geojson]
  );

  // Client-side navigation swaps props without remounting the Map, so
  // initialViewState alone would keep the old view. area is read via
  // ref because its identity changes every server render. The sync effect
  // must stay declared before the refit effect that reads it.
  const areaRef = useRef(area);
  useEffect(() => {
    areaRef.current = area;
  }, [area]);
  useEffect(() => {
    applyViewState(mapRef.current, computeInitialViewState(areaRef.current, null));
  }, [datasetId]);

  // The far-center guard and the no-bounds fallback both need the data bbox,
  // which only exists once the geojson arrives. Refit only when it changes
  // the outcome, so the common case never jumps.
  useEffect(() => {
    if (!geojson) return;
    const dataBounds = calculateBbox(geojson);
    if (!dataBounds) return;
    const withData = computeInitialViewState(areaRef.current, dataBounds);
    const withoutData = computeInitialViewState(areaRef.current, null);
    if (JSON.stringify(withData) !== JSON.stringify(withoutData)) {
      applyViewState(mapRef.current, withData);
    }
  }, [geojson]);

  const statItems = [
    { type: "features" as const, label: t("stats.features"), value: stats.features },
    { type: "contributors" as const, label: t("stats.contributors"), value: stats.contributors },
    { type: "lastEdited" as const, label: t("stats.lastEdited"), value: stats.lastEdited },
  ];

  return (
    <div className="relative h-full min-h-[320px] bg-gray-100 dark:bg-gray-900">
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={computeInitialViewState(area, null)}
        dragPan
        scrollZoom={false}
        dragRotate={false}
        doubleClickZoom
        touchZoomRotate
        keyboard
        reuseMaps
        style={{ width: "100%", height: "100%" }}
      >
        {boundary && <AoiBoundaryLayer boundary={boundary} />}
        {processedData && (
          <MapLayers geoJSONData={processedData} categoricalTheme={null} />
        )}
        <div className="absolute right-3 bottom-3">
          <NavigationControl showCompass={false} visualizePitch={false} />
        </div>
      </Map>

      <Link
        href={href}
        aria-label={`${title} — ${t("viewDataset")}`}
        className="group absolute bottom-12 right-4 block max-w-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-4 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0 w-8 h-8 text-olive-600 opacity-60">
            {getTemplateIcon(templateId, category)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            <DatasetStatsRow stats={statItems} className="mt-1.5" />
          </div>
          <ArrowRight
            aria-hidden
            strokeWidth={2.5}
            className="shrink-0 w-5 h-5 text-neutral-500 transition-all group-hover:translate-x-0.5 group-hover:text-olive-600"
          />
        </div>
      </Link>
    </div>
  );
}
