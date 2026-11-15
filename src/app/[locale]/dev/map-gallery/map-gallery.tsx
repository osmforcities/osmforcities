"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { mapStyle } from "@/lib/map-tiles";
import { ensurePmtilesProtocol } from "@/lib/pmtiles-protocol";
import { GeoJSONFeatureCollectionSchema } from "@/types/geojson";
import { processOSMFeaturesForVisualization } from "@/lib/osm-data-processor";
import { MapLayers } from "@/components/dataset/map/layers";
import { TilesLayerGroup } from "@/components/dataset/map/layers/tiles-layer-group";
import {
  GALLERY_ZOOMS,
  type GalleryCase,
  type GalleryRenderMode,
} from "@/lib/map-gallery";

ensurePmtilesProtocol();

export type GalleryRow = {
  galleryCase: GalleryCase;
  dataset: {
    renderModes: GalleryRenderMode[];
    center: [number, number] | null;
    geojson: unknown;
    tilesPath: string | null;
    pointCount: number;
  } | null;
};

type GalleryCell = {
  captureOrder: number;
  zoom: number;
  renderMode: GalleryRenderMode;
  center: [number, number];
  features: FeatureCollection | null;
  tilesPath: string | null;
  pointCount: number;
};

type Capture = string | "timed-out";

const CELL_SIZE = 220;
// A map that never goes idle (failed style, lost WebGL context) would stall every cell after it
const CAPTURE_TIMEOUT_MS = 20_000;

// Dev-only UI, intentionally not translated
const TEXT = {
  title: "Map style gallery",
  intro: [
    `Use this page to check a map style change on many kinds of data at once. Each row is a real dataset from the local database, drawn at zooms ${GALLERY_ZOOMS.join(", ")} around the same spot.`,
    "Change a style, reload, and compare. A row marked missing needs its dataset first: open the link it shows while signed in.",
    "To add a case, add one line in src/lib/map-gallery.ts.",
  ],
  heading: (c: GalleryCase) =>
    `${c.label}: ${c.templateId} in ${c.areaName} (relation ${c.osmRelationId})`,
  missing: (c: GalleryCase) =>
    `Missing locally: ${c.templateId} in relation ${c.osmRelationId}. Open /en/area/${c.osmRelationId}/dataset/${c.templateId} to create it.`,
  nothingToRender:
    "Nothing to render: no stored geojson, no served archive (tiles-only lane off?) or no center.",
  zoom: (zoom: number) => `z${zoom}`,
  alt: (cell: GalleryCell) => `${cell.renderMode} at z${cell.zoom}`,
  timedOut: "Timed out",
};

function toVisualFeatures(geojson: unknown): FeatureCollection | null {
  const parsed = GeoJSONFeatureCollectionSchema.safeParse(geojson);
  if (!parsed.success) return null;
  return processOSMFeaturesForVisualization(parsed.data as FeatureCollection);
}

// One live map at a time, kept as an image: browsers cap live WebGL contexts at about 16, the grid holds up to 64
export function MapGallery({ rows }: { rows: GalleryRow[] }) {
  const [captures, setCaptures] = useState<Capture[]>([]);

  const renderGroupsByRow = useMemo(() => {
    let captureOrder = 0;
    return rows.map(({ dataset }) => {
      if (!dataset?.center) return [];
      const center = dataset.center;
      const features = dataset.renderModes.includes("geojson")
        ? toVisualFeatures(dataset.geojson)
        : null;
      return dataset.renderModes.map((renderMode) => ({
        renderMode,
        cells: GALLERY_ZOOMS.map(
          (zoom): GalleryCell => ({
            captureOrder: captureOrder++,
            zoom,
            renderMode,
            center,
            features,
            tilesPath: dataset.tilesPath,
            pointCount: dataset.pointCount,
          })
        ),
      }));
    });
  }, [rows]);

  // The timeout and the idle event can both fire before a re-render; only the first one counts
  const addCapture = useCallback(
    (captureOrder: number, capture: Capture) =>
      setCaptures((prev) =>
        prev.length === captureOrder ? [...prev, capture] : prev
      ),
    []
  );

  return (
    <main className="p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{TEXT.title}</h1>
        {TEXT.intro.map((line) => (
          <p key={line} className="text-sm text-gray-600 max-w-prose mt-1">
            {line}
          </p>
        ))}
      </header>
      {rows.map(({ galleryCase, dataset }, rowIndex) => (
        <section key={`${galleryCase.templateId}/${galleryCase.osmRelationId}`}>
          <h2 className="font-medium">{TEXT.heading(galleryCase)}</h2>
          {!dataset ? (
            <Placeholder>{TEXT.missing(galleryCase)}</Placeholder>
          ) : renderGroupsByRow[rowIndex].length === 0 ? (
            <Placeholder>{TEXT.nothingToRender}</Placeholder>
          ) : (
            renderGroupsByRow[rowIndex].map(({ renderMode, cells }) => (
              <div key={renderMode} className="flex items-center gap-2 mt-2">
                <span className="w-16 text-xs text-gray-600">{renderMode}</span>
                {cells.map((cell) => (
                  <figure key={cell.zoom} style={{ width: CELL_SIZE }}>
                    <GalleryCellView
                      cell={cell}
                      capture={captures[cell.captureOrder]}
                      isLive={cell.captureOrder === captures.length}
                      onCapture={addCapture}
                    />
                    <figcaption className="text-xs text-gray-600">
                      {TEXT.zoom(cell.zoom)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))
          )}
        </section>
      ))}
    </main>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 p-3 text-sm border border-dashed border-gray-400 text-gray-700">
      {children}
    </p>
  );
}

function GalleryCellView({
  cell,
  capture,
  isLive,
  onCapture,
}: {
  cell: GalleryCell;
  capture: Capture | undefined;
  isLive: boolean;
  onCapture: (captureOrder: number, capture: Capture) => void;
}) {
  const box = { width: CELL_SIZE, height: CELL_SIZE };

  useEffect(() => {
    if (!isLive) return;
    const timer = setTimeout(
      () => onCapture(cell.captureOrder, "timed-out"),
      CAPTURE_TIMEOUT_MS
    );
    return () => clearTimeout(timer);
  }, [isLive, onCapture, cell.captureOrder]);

  if (capture === "timed-out") {
    return (
      <div style={box} className="grid place-items-center bg-gray-100 text-xs">
        {TEXT.timedOut}
      </div>
    );
  }
  if (capture) {
    // eslint-disable-next-line @next/next/no-img-element -- data URL capture, next/image adds nothing
    return <img src={capture} alt={TEXT.alt(cell)} style={box} />;
  }
  if (!isLive) return <div style={box} className="bg-gray-100" />;

  const [longitude, latitude] = cell.center;
  return (
    <div style={box}>
      <Map
        mapStyle={mapStyle}
        initialViewState={{ longitude, latitude, zoom: cell.zoom }}
        style={box}
        interactive={false}
        attributionControl={false}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        onLoad={({ target }) =>
          target.once("idle", () =>
            onCapture(cell.captureOrder, target.getCanvas().toDataURL())
          )
        }
      >
        {cell.renderMode === "tiles" && cell.tilesPath ? (
          <TilesLayerGroup
            tilesUrl={`pmtiles://${cell.tilesPath}`}
            pointCount={cell.pointCount}
            curatedTheme={null}
          />
        ) : (
          cell.features && <MapLayers geoJSONData={cell.features} curatedTheme={null} />
        )}
      </Map>
    </div>
  );
}
