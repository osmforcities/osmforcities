"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Link } from "react-aria-components";
import { ArrowRight, MapPin, Pencil, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FeatureCollection } from "geojson";
import { mapStyle } from "@/lib/map-tiles";
import { getCategoryIcon } from "@/lib/category-icons";
import { calculateBbox } from "@/lib/utils";
import type { Bbox } from "@/types/geojson";
import type { ProcessedDatasetStats } from "@/lib/dataset-stats";
import { formatCompactNumber } from "@/components/ui/dataset-card";
import { MapLayers } from "@/components/dataset/map/layers";
import { AoiBoundaryLayer } from "@/components/dataset/map/aoi-boundary-layer";
import { processOSMFeaturesForVisualization } from "@/lib/osm-data-processor";

type FeaturedDatasetMapClientProps = {
  datasetId: string;
  areaId: number;
  bounds: Bbox | null;
  title: string;
  category: string;
  stats: ProcessedDatasetStats;
  href: string;
};

export function FeaturedDatasetMapClient({
  datasetId,
  areaId,
  bounds,
  title,
  category,
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
    // Marketing page: on failure keep the basemap + card, no error UI
    fetch(`/api/datasets/${datasetId}/geojson`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FeatureCollection | null) => {
        if (data) setGeojson(data);
      })
      .catch(() => {});

    fetch(`/api/areas/${areaId}/boundary`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FeatureCollection | null) => {
        if (data) setBoundary(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [datasetId, areaId]);

  // Same processing as the dataset page map so rendering matches it exactly
  const processedData = useMemo(
    () => (geojson ? processOSMFeaturesForVisualization(geojson) : null),
    [geojson]
  );

  // Reposition whenever a different dataset arrives: client-side navigation
  // re-renders the hero with new props but does not remount the Map, so
  // initialViewState alone would leave the old view. bounds is intentionally
  // read via ref — its identity changes every server render.
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  useEffect(() => {
    if (boundsRef.current) {
      mapRef.current?.fitBounds(boundsRef.current, {
        padding: 40,
        duration: 0,
      });
    }
  }, [datasetId]);

  // Server bounds cover most datasets; fit to the data when the area has none
  useEffect(() => {
    if (bounds || !geojson) return;
    const dataBounds = calculateBbox(geojson);
    if (dataBounds) {
      mapRef.current?.fitBounds(dataBounds, { padding: 40, duration: 0 });
    }
  }, [bounds, geojson]);

  const statItems = [
    { type: "features", label: t("stats.features"), value: formatCompactNumber(stats.features), Icon: MapPin },
    { type: "contributors", label: t("stats.contributors"), value: formatCompactNumber(stats.contributors), Icon: Users },
    { type: "lastEdited", label: t("stats.lastEdited"), value: stats.lastEdited, Icon: Pencil },
  ];

  return (
    <div className="relative h-full min-h-[320px] bg-gray-100 dark:bg-gray-900">
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        initialViewState={
          bounds
            ? { bounds, fitBoundsOptions: { padding: 40 } }
            : { longitude: 0, latitude: 0, zoom: 1 }
        }
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

      {/* Info card overlay, bottom-right clear of the attribution bar.
          The whole card is the link to the dataset page. */}
      <Link
        href={href}
        aria-label={`${title} — ${t("viewDataset")}`}
        className="group absolute bottom-12 right-4 block max-w-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-4 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        {/* Columns: icon | content (title + stats) | arrow, all vertically centered */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center shrink-0 w-8 h-8 text-olive-600 opacity-60">
            {getCategoryIcon(category)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            <div className="flex items-center gap-3 text-[10px] mt-1.5">
              {statItems.map(({ type, label, value, Icon }) => (
                <div
                  key={type}
                  aria-label={label}
                  className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400"
                >
                  <Icon className="w-2.5 h-2.5" />
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
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
