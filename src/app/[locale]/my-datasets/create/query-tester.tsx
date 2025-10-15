"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Map, { AttributionControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { useOverpassQuery } from "@/hooks/useOverpassQuery";
import { Area } from "@/types/area";
import { convertOverpassToGeoJSON } from "@/lib/osm";
import { FeatureCollection } from "geojson";
import { useTranslations } from "next-intl";
import { MapLayers } from "@/components/dataset/map/layers";
import { processOSMFeaturesForVisualization } from "@/lib/osm-data-processor";
import { DateFilterControls } from "@/components/dataset/map/date-filter-controls";
import { AgeLegend } from "@/components/dataset/map/age-legend";
import { NoDataMessage } from "@/components/dataset/map/no-data-message";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  overpassQuery: string;
  tags: string[];
};

type QueryTesterProps = {
  selectedArea: Area | null;
  selectedTemplate: Template | undefined;
};

export default function QueryTester({
  selectedArea,
  selectedTemplate,
}: QueryTesterProps) {
  const t = useTranslations("QueryTester");
  const mapRef = useRef<MapRef | null>(null);

  const updateMapBounds = useCallback(() => {
    if (selectedArea && mapRef.current) {
      mapRef.current.fitBounds(
        [
          selectedArea.boundingBox[1], // minLon
          selectedArea.boundingBox[0], // minLat
          selectedArea.boundingBox[3], // maxLon
          selectedArea.boundingBox[2], // maxLat
        ],
        { padding: 50, animate: false }
      );
    }
  }, [selectedArea]);

  // Handle initial load and area changes
  useEffect(() => {
    if (mapRef.current) {
      updateMapBounds();
    }
  }, [updateMapBounds]);
  const [queryString, setQueryString] = useState<string>("");
  const [hasExecutedQuery, setHasExecutedQuery] = useState(false);
  const [dateFilter, setDateFilter] = useState<
    "all" | "7days" | "30days" | "90days"
  >("all");

  useEffect(() => {
    if (selectedArea && selectedTemplate) {
      // Replace {OSM_RELATION_ID} placeholder with the area's OSM ID
      const modifiedQuery = selectedTemplate.overpassQuery.replace(
        /\{OSM_RELATION_ID\}/g,
        selectedArea.id.toString()
      );
      setQueryString(modifiedQuery);
    }
  }, [selectedArea, selectedTemplate]);

  const {
    data: results = [],
    isFetching,
    error,
    refetch,
  } = useOverpassQuery({
    queryString,
    enabled: false,
  });

  const testQuery = () => {
    if (!selectedArea || !selectedTemplate) return;
    setHasExecutedQuery(true);
    refetch({ cancelRefetch: false });
  };

  const rawGeoJSONData: FeatureCollection =
    results.length > 0
      ? convertOverpassToGeoJSON({ elements: results })
      : { type: "FeatureCollection", features: [] };

  const geojsonData = processOSMFeaturesForVisualization(
    rawGeoJSONData,
    dateFilter
  );

  if (!selectedArea || !selectedTemplate) {
    return (
      <div className="border border-gray-200 p-4 rounded-md bg-gray-50">
        <p className="text-gray-500">{t("selectAreaTemplateFirst")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 p-4 rounded-md">
        <h3 className="font-medium mb-2">{t("queryPreview")}</h3>
        <div className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap">{queryString}</pre>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={testQuery}
          disabled={isFetching}
          className="bg-blue-600 text-white py-2 px-6 border-2 border-blue-600 hover:bg-white hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFetching ? t("testingQuery") : t("testQuery")}
        </Button>
      </div>

      {isFetching && (
        <div className="border border-gray-200 p-4 rounded-md">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>{t("queryingOverpass")}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-200 p-4 rounded-md bg-red-50">
          <h3 className="font-medium text-red-800 mb-2">{t("error")}</h3>
          <p className="text-red-700 text-sm">{(error as Error).message}</p>
        </div>
      )}

      {!isFetching && !error && results.length > 0 && (
        <div className="space-y-4">
          <DateFilterControls
            availableTimeframes={geojsonData.availableTimeframes}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
          />

          <NoDataMessage
            hasData={geojsonData.features.length > 0}
            dateFilter={dateFilter}
          />

          <div
            className="border border-gray-200 rounded-md overflow-hidden relative"
            style={{ height: 500 }}
          >
            <Map
              ref={mapRef}
              onLoad={updateMapBounds}
              mapStyle="https://tiles.openfreemap.org/styles/positron"
              interactiveLayerIds={[
                "simplified-features",
                "detailed-polygons",
                "detailed-lines",
                "detailed-points",
              ]}
              initialViewState={
                selectedArea
                  ? {
                      bounds: [
                        selectedArea.boundingBox[1], // minLon
                        selectedArea.boundingBox[0], // minLat
                        selectedArea.boundingBox[3], // maxLon
                        selectedArea.boundingBox[2], // maxLat
                      ],
                      fitBoundsOptions: { padding: 20 },
                    }
                  : undefined
              }
            >
              <AttributionControl position="bottom-right" />

              {geojsonData.features.length > 0 && (
                <MapLayers geoJSONData={geojsonData} />
              )}
            </Map>

            <div className="absolute bottom-4 left-4 z-10">
              <AgeLegend />
            </div>
          </div>
        </div>
      )}

      {!isFetching && !error && hasExecutedQuery && results.length === 0 && (
        <div className="border border-gray-200 p-4 rounded-md bg-yellow-50">
          <h3 className="font-medium text-yellow-800 mb-2">{t("noResults")}</h3>
          <p className="text-yellow-700 text-sm">{t("noResultsDescription")}</p>
          <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
            <li>{t("noFeaturesMatch")}</li>
            <li>{t("areaNoAmenities")}</li>
            <li>{t("queryNeedsAdjustment")}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
