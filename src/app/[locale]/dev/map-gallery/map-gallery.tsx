"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyle } from "@/lib/map-tiles";
import { ensurePmtilesProtocol } from "@/lib/pmtiles-protocol";
import { Link } from "@/i18n/navigation";
import { TilesLayerGroup } from "@/components/dataset/map/layers/tiles-layer-group";
import {
  DatasetFullMap,
  type MapPosition,
} from "@/components/dataset/full-map";
import type { Dataset } from "@/schemas/dataset";
import { GALLERY_ZOOMS, type GalleryCase } from "@/lib/map-gallery";

ensurePmtilesProtocol();

type GalleryDataset = {
  detail: Dataset;
  center: [number, number] | null;
  tilesPath: string | null;
  pointCount: number;
};

export type GalleryRow = {
  galleryCase: GalleryCase;
  dataset: GalleryDataset | null;
};

type GalleryCell = {
  rowIndex: number;
  captureOrder: number;
  zoom: number;
};

type Selection = {
  rowIndex: number;
  position: MapPosition;
};

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
    "Rows need the local tiler running. Over-cap cases like Amsterdam buildings can't be created without it. Setup is in docs/features/large-datasets.md.",
    "A row marked missing needs its dataset first: sign in, open its link, then reload this page. To add a case, add one line in src/lib/map-gallery.ts.",
  ],
  heading: (c: GalleryCase) => `${c.label}: ${c.templateId} in ${c.areaName}`,
  missing: (c: GalleryCase) =>
    `Missing locally: ${c.templateId} in relation ${c.osmRelationId}.`,
  createLink: "Open the dataset page to create it",
  nothingToRender: "Nothing to render: no served archive or no center.",
  nothingSelected: "No local dataset to show yet.",
  zoom: (zoom: number) => `z${zoom}`,
  cellLabel: (cell: GalleryCell) => `Open at z${cell.zoom}`,
  timedOut: "Timed out",
};

function openingSelection(rows: GalleryRow[]): Selection | null {
  const rowIndex = rows.findIndex(({ dataset }) => dataset?.center && dataset.tilesPath);
  const dataset = rows[rowIndex]?.dataset;
  if (!dataset?.center) return null;
  const [longitude, latitude] = dataset.center;
  return {
    rowIndex,
    position: { longitude, latitude, zoom: OPENING_ZOOM },
  };
}

// Picker cells are captured images, one live map at a time: browsers cap live WebGL contexts at about 16, the grid holds up to 64
export function MapGallery({ rows }: { rows: GalleryRow[] }) {
  const [captures, setCaptures] = useState<(string | null)[]>([]);
  const [selection, setSelection] = useState(() => openingSelection(rows));
  const [mapVersion, setMapVersion] = useState(0);

  const cellsByRow = useMemo(() => {
    let captureOrder = 0;
    return rows.map(({ dataset }, rowIndex) => {
      if (!dataset?.center || !dataset.tilesPath) return [];
      return GALLERY_ZOOMS.map(
        (zoom): GalleryCell => ({ rowIndex, captureOrder: captureOrder++, zoom })
      );
    });
  }, [rows]);

  // The timeout and the idle event can both fire before a re-render; only the first one counts
  const addCapture = useCallback(
    (captureOrder: number, capture: string | null) =>
      setCaptures((prev) =>
        prev.length === captureOrder ? [...prev, capture] : prev
      ),
    []
  );

  const openCell = useCallback(
    (cell: GalleryCell) => {
      const center = rows[cell.rowIndex].dataset?.center;
      if (!center) return;
      const [longitude, latitude] = center;
      setSelection({
        rowIndex: cell.rowIndex,
        position: { longitude, latitude, zoom: cell.zoom },
      });
      setMapVersion((v) => v + 1);
    },
    [rows]
  );

  const keepPosition = useCallback(
    (position: MapPosition) =>
      setSelection((prev) => prev && { ...prev, position }),
    []
  );

  const selectedRow = selection ? rows[selection.rowIndex] : null;

  return (
    <main className="flex h-[calc(100dvh_-_var(--nav-height))] overflow-hidden">
      <section className="flex-1 flex flex-col min-w-0">
        {selection && selectedRow?.dataset ? (
          <>
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 text-sm">
              <span className="font-medium">{TEXT.heading(selectedRow.galleryCase)}</span>
            </div>
            <div className="flex-1 min-h-0">
              <DatasetFullMap
                key={mapVersion}
                dataset={selectedRow.dataset.detail}
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
        </header>
        {rows.map(({ galleryCase, dataset }, rowIndex) => {
          const center = dataset?.center;
          return (
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
              ) : !center || cellsByRow[rowIndex].length === 0 ? (
                <Placeholder>{TEXT.nothingToRender}</Placeholder>
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  {cellsByRow[rowIndex].map((cell) => (
                    <figure key={cell.zoom} style={{ width: CELL_SIZE }}>
                      <button
                        type="button"
                        aria-label={TEXT.cellLabel(cell)}
                        onClick={() => openCell(cell)}
                        className="block hover:ring-2 hover:ring-gray-900"
                      >
                        <GalleryCellView
                          cell={cell}
                          center={center}
                          dataset={dataset}
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
              )}
            </section>
          );
        })}
      </aside>
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
  center,
  dataset,
  capture,
  isLive,
  onCapture,
}: {
  cell: GalleryCell;
  center: [number, number];
  dataset: GalleryDataset;
  capture: string | null | undefined;
  isLive: boolean;
  onCapture: (captureOrder: number, capture: string | null) => void;
}) {
  const box = { width: CELL_SIZE, height: CELL_SIZE };

  useEffect(() => {
    if (!isLive) return;
    const timer = setTimeout(
      () => onCapture(cell.captureOrder, null),
      CAPTURE_TIMEOUT_MS
    );
    return () => clearTimeout(timer);
  }, [isLive, onCapture, cell.captureOrder]);

  if (capture === null) {
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

  const [longitude, latitude] = center;
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
        {dataset.tilesPath && (
          <TilesLayerGroup
            tilesUrl={`pmtiles://${dataset.tilesPath}`}
            pointCount={dataset.pointCount}
            curatedTheme={null}
          />
        )}
      </Map>
    </div>
  );
}
