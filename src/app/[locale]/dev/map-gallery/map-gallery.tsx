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
import { Link } from "@/i18n/navigation";
import { TILES_ENABLED } from "@/lib/dataset-tiles";
import { TilesLayerGroup } from "@/components/dataset/map/layers/tiles-layer-group";
import {
  DatasetFullMap,
  type MapPosition,
} from "@/components/dataset/full-map";
import type { Dataset } from "@/schemas/dataset";
import {
  GALLERY_ZOOMS,
  type GalleryCase,
  type GalleryRenderMode,
} from "@/lib/map-gallery";

ensurePmtilesProtocol();

export type GalleryRow = {
  galleryCase: GalleryCase;
  dataset: {
    detail: Dataset;
    renderModes: GalleryRenderMode[];
    center: [number, number] | null;
    tilesPath: string | null;
    pointCount: number;
  } | null;
};

type GalleryCell = {
  rowIndex: number;
  captureOrder: number;
  zoom: number;
  renderMode: GalleryRenderMode;
  center: [number, number];
  features: FeatureCollection | null;
  tilesPath: string | null;
  pointCount: number;
};

type Selection = {
  rowIndex: number;
  renderMode: GalleryRenderMode;
  position: MapPosition;
};

type Capture = string | "timed-out";

const CELL_SIZE = 112;
const OPENING_ZOOM = 12;
// A map that never goes idle (failed style, lost WebGL context) would stall every cell after it
const CAPTURE_TIMEOUT_MS = 20_000;

// Dev-only UI, intentionally not translated
const TEXT = {
  title: "Map style gallery",
  intro: [
    `Use this page to check a map style change on many kinds of data at once. Each row on the right is a real dataset from the local database, drawn at zooms ${GALLERY_ZOOMS.join(", ")} around the same spot.`,
    "Click a cell to open it in the big map, then pan, zoom and switch views from the legend like on the dataset page. Change a style, reload, and compare.",
    "A row marked missing needs its dataset first: sign in, open its link, then reload this page. To add a case, add one line in src/lib/map-gallery.ts.",
  ],
  heading: (c: GalleryCase) => `${c.label}: ${c.templateId} in ${c.areaName}`,
  missing: (c: GalleryCase) =>
    `Missing locally: ${c.templateId} in relation ${c.osmRelationId}.`,
  createLink: "Open the dataset page to create it",
  tilesOff:
    "Tiles are off. Large cases like Amsterdam buildings can't be created until the local tiler runs. Setup is in docs/features/large-datasets.md.",
  nothingToRender:
    "Nothing to render: no stored geojson, no served archive (tiles-only lane off?) or no center.",
  nothingSelected: "No local dataset to show yet.",
  zoom: (zoom: number) => `z${zoom}`,
  cellLabel: (cell: GalleryCell) => `Open ${cell.renderMode} at z${cell.zoom}`,
  timedOut: "Timed out",
};

function toVisualFeatures(geojson: unknown): FeatureCollection | null {
  const parsed = GeoJSONFeatureCollectionSchema.safeParse(geojson);
  if (!parsed.success) return null;
  return processOSMFeaturesForVisualization(parsed.data as FeatureCollection);
}

function openingSelection(rows: GalleryRow[]): Selection | null {
  const rowIndex = rows.findIndex(({ dataset }) => dataset?.center && dataset.renderModes.length);
  const dataset = rows[rowIndex]?.dataset;
  if (!dataset?.center) return null;
  const [longitude, latitude] = dataset.center;
  return {
    rowIndex,
    renderMode: dataset.renderModes[0],
    position: { longitude, latitude, zoom: OPENING_ZOOM },
  };
}

// Picker cells are captured images, one live map at a time: browsers cap live WebGL contexts at about 16, the grid holds up to 64
export function MapGallery({ rows }: { rows: GalleryRow[] }) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [selection, setSelection] = useState(() => openingSelection(rows));
  const [mapVersion, setMapVersion] = useState(0);

  const renderGroupsByRow = useMemo(() => {
    let captureOrder = 0;
    return rows.map(({ dataset }, rowIndex) => {
      if (!dataset?.center) return [];
      const center = dataset.center;
      const features = dataset.renderModes.includes("geojson")
        ? toVisualFeatures(dataset.detail.geojson)
        : null;
      return dataset.renderModes.map((renderMode) => ({
        renderMode,
        cells: GALLERY_ZOOMS.map(
          (zoom): GalleryCell => ({
            rowIndex,
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

  const openCell = useCallback((cell: GalleryCell) => {
    const [longitude, latitude] = cell.center;
    setSelection({
      rowIndex: cell.rowIndex,
      renderMode: cell.renderMode,
      position: { longitude, latitude, zoom: cell.zoom },
    });
    setMapVersion((v) => v + 1);
  }, []);

  const keepPosition = useCallback(
    (position: MapPosition) =>
      setSelection((prev) => prev && { ...prev, position }),
    []
  );

  const switchRenderMode = useCallback((renderMode: GalleryRenderMode) => {
    setSelection((prev) => prev && { ...prev, renderMode });
    setMapVersion((v) => v + 1);
  }, []);

  const selectedRow = selection ? rows[selection.rowIndex] : null;

  return (
    <main className="flex h-[calc(100dvh_-_var(--nav-height))] overflow-hidden">
      <section className="flex-1 flex flex-col min-w-0">
        {selection && selectedRow?.dataset ? (
          <>
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 text-sm">
              <span className="font-medium">{TEXT.heading(selectedRow.galleryCase)}</span>
              {selectedRow.dataset.renderModes.length > 1 &&
                selectedRow.dataset.renderModes.map((renderMode) => (
                  <button
                    key={renderMode}
                    type="button"
                    aria-pressed={renderMode === selection.renderMode}
                    onClick={() => switchRenderMode(renderMode)}
                    className="px-2 py-0.5 border border-gray-300 aria-pressed:bg-gray-900 aria-pressed:text-white"
                  >
                    {renderMode}
                  </button>
                ))}
            </div>
            <div className="flex-1 min-h-0">
              <DatasetFullMap
                key={mapVersion}
                dataset={datasetInMode(selectedRow.dataset.detail, selection.renderMode)}
                boundary={null}
                initialPosition={selection.position}
                onPositionChange={keepPosition}
              />
            </div>
          </>
        ) : (
          <p className="m-auto text-sm text-gray-600">{TEXT.nothingSelected}</p>
        )}
      </section>

      <aside className="w-[520px] shrink-0 overflow-y-auto border-l border-gray-200 p-4 space-y-6">
        <header>
          <h1 className="text-xl font-semibold">{TEXT.title}</h1>
          {TEXT.intro.map((line) => (
            <p key={line} className="text-sm text-gray-600 mt-1">
              {line}
            </p>
          ))}
          {!TILES_ENABLED && <Placeholder>{TEXT.tilesOff}</Placeholder>}
        </header>
        {rows.map(({ galleryCase, dataset }, rowIndex) => (
          <section key={`${galleryCase.templateId}/${galleryCase.osmRelationId}`}>
            <h2 className="text-sm font-medium">{TEXT.heading(galleryCase)}</h2>
            {!dataset ? (
              <Placeholder>
                {TEXT.missing(galleryCase)}
                <Link
                  href={`/area/${galleryCase.osmRelationId}/dataset/${galleryCase.templateId}`}
                  target="_blank"
                  className="ml-1 underline"
                >
                  {TEXT.createLink}
                </Link>
              </Placeholder>
            ) : renderGroupsByRow[rowIndex].length === 0 ? (
              <Placeholder>{TEXT.nothingToRender}</Placeholder>
            ) : (
              renderGroupsByRow[rowIndex].map(({ renderMode, cells }) => (
                <div key={renderMode} className="flex items-center gap-1 mt-1">
                  <span className="w-12 text-xs text-gray-600">{renderMode}</span>
                  {cells.map((cell) => (
                    <figure key={cell.zoom} style={{ width: CELL_SIZE }}>
                      <button
                        type="button"
                        aria-label={TEXT.cellLabel(cell)}
                        onClick={() => openCell(cell)}
                        className="block hover:ring-2 hover:ring-gray-900"
                      >
                        <GalleryCellView
                          cell={cell}
                          capture={captures[cell.captureOrder]}
                          isLive={cell.captureOrder === captures.length}
                          onCapture={addCapture}
                        />
                      </button>
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
      </aside>
    </main>
  );
}

function datasetInMode(dataset: Dataset, renderMode: GalleryRenderMode): Dataset {
  return renderMode === "geojson" ? { ...dataset, tilesServedJobId: null } : dataset;
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
    return <img src={capture} alt="" style={box} />;
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
