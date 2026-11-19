"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  GALLERY_ZOOMS,
  isDue,
  markLine,
  nextDueStopIndex,
  reviewTally,
  type GalleryCase,
  type ReviewMark,
  type ReviewMarks,
} from "@/lib/map-gallery";

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

const REVIEW_STORAGE_KEY = "map-gallery-review";
const MARK_RING = { ok: "ring-2 ring-green-600", notOk: "ring-2 ring-red-600" };
const CURRENT_STOP_OUTLINE = "outline outline-2 outline-offset-2 outline-gray-900";

const CELL_SIZE = 112;
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
  review: {
    intro:
      "Review: the bar above the map walks through every dataset at every zoom. Press o for ok, or n, type what is wrong and press Enter. [ and ] step back and forth. Zoom, pan, hover and switch the legend view freely: a mark records the zoom and view on screen. Marks stay in this browser.",
    stop: (index: number, total: number) => `Stop ${index + 1}/${total}`,
    noStop: "Not a review stop",
    ok: "Ok (o)",
    notOk: "Not ok",
    notePlaceholder: "Not ok: what is wrong? (n, then Enter)",
    marked: (mark: ReviewMark) => (mark.ok ? "marked ok" : "marked not ok"),
    before: (mark: ReviewMark) =>
      `Changed since your mark: ${mark.ok ? "ok" : "not ok"}${mark.note && `, "${mark.note}"`}`,
    tally: ({ ok, notOk, left }: ReturnType<typeof reviewTally>) =>
      `${ok} ok, ${notOk} not ok, ${left || "none"} left${left === 0 ? ": review done, copy the marks" : ""}`,
    copy: "Copy marks",
    copied: "Copied",
    stopLabel: (c: GalleryCase, zoom: number) =>
      `${c.templateId} in ${c.areaName} z${zoom}`,
  },
};

// Picker cells are captured images, one live map at a time: browsers cap live WebGL contexts at about 16, the grid holds up to 64
export function MapGallery({ rows }: { rows: GalleryRow[] }) {
  const [captures, setCaptures] = useState<(string | null)[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
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

  const reviewStops = useMemo(() => cellsByRow.flat(), [cellsByRow]);
  const stopLabels = useMemo(
    () =>
      reviewStops.map((cell) =>
        TEXT.review.stopLabel(rows[cell.rowIndex].galleryCase, cell.zoom)
      ),
    [reviewStops, rows]
  );
  const [marks, setMarks] = useState<ReviewMarks>({});
  const [stopIndex, setStopIndex] = useState(-1);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mapPaneRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);

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
      setStopIndex(reviewStops.indexOf(cell));
      setNoteDraft(null);
    },
    [rows, reviewStops]
  );

  useEffect(() => {
    const stored: ReviewMarks = JSON.parse(
      localStorage.getItem(REVIEW_STORAGE_KEY) ?? "{}"
    );
    setMarks(stored);
    const stop = reviewStops[Math.max(nextDueStopIndex(stopLabels, -1, stored), 0)];
    if (stop) openCell(stop);
  }, [reviewStops, stopLabels, openCell]);

  const stop: GalleryCell | undefined = reviewStops[stopIndex];
  const savedMark = stop && marks[stopLabels[stopIndex]];
  const noteValue = noteDraft ?? (isDue(savedMark) ? "" : savedMark?.note) ?? "";

  const markStop = (ok: boolean) => {
    if (!stop || !selection) return;
    const next: ReviewMarks = {
      ...marks,
      [stopLabels[stopIndex]]: {
        ok,
        note: ok ? "" : noteValue.trim(),
        zoom: Number(selection.position.zoom.toFixed(1)),
        view:
          mapPaneRef.current
            ?.querySelector<HTMLSelectElement>("select[aria-label]")
            ?.selectedOptions[0]?.textContent?.trim() ?? "",
      },
    };
    setMarks(next);
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(next));
    setCopied(false);
    noteRef.current?.blur();
    const nextStop = reviewStops[nextDueStopIndex(stopLabels, stopIndex, next)];
    if (nextStop) openCell(nextStop);
    else setNoteDraft(null);
  };

  const copyMarks = async () => {
    await navigator.clipboard.writeText(
      stopLabels.map((label) => markLine(label, marks[label])).join("\n")
    );
    setCopied(true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const typing =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement;
      if (typing) return;
      if (event.key === "o") markStop(true);
      if (event.key === "n") {
        event.preventDefault();
        noteRef.current?.focus();
      }
      if (event.key === "[" && reviewStops[stopIndex - 1]) openCell(reviewStops[stopIndex - 1]);
      if (event.key === "]" && reviewStops[stopIndex + 1]) openCell(reviewStops[stopIndex + 1]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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
              <span className="ml-auto tabular-nums text-gray-600">
                {TEXT.review.tally(reviewTally(stopLabels, marks))}
              </span>
              <button
                type="button"
                onClick={copyMarks}
                className="px-2 py-0.5 border border-gray-300"
              >
                {copied ? TEXT.review.copied : TEXT.review.copy}
              </button>
            </div>
            <form
              className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 text-sm"
              onSubmit={(event) => {
                event.preventDefault();
                markStop(false);
              }}
            >
              <span className="font-medium tabular-nums">
                {stop
                  ? TEXT.review.stop(stopIndex, reviewStops.length)
                  : TEXT.review.noStop}
              </span>
              {savedMark &&
                (savedMark.stale ? (
                  <span className="text-gray-600">{TEXT.review.before(savedMark)}</span>
                ) : (
                  <span className={savedMark.ok ? "text-green-700" : "text-red-700"}>
                    {TEXT.review.marked(savedMark)}
                  </span>
                ))}
              <button
                type="button"
                disabled={!stop}
                onClick={() => markStop(true)}
                className="px-2 py-0.5 border border-gray-300 disabled:opacity-40"
              >
                {TEXT.review.ok}
              </button>
              <input
                ref={noteRef}
                value={noteValue}
                onChange={(event) => setNoteDraft(event.target.value)}
                disabled={!stop}
                placeholder={TEXT.review.notePlaceholder}
                aria-label={TEXT.review.notePlaceholder}
                className="flex-1 min-w-0 px-2 py-0.5 border border-gray-300"
              />
              <button
                type="submit"
                disabled={!stop}
                className="px-2 py-0.5 border border-gray-300 disabled:opacity-40"
              >
                {TEXT.review.notOk}
              </button>
            </form>
            <div ref={mapPaneRef} className="flex-1 min-h-0">
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
          <p className="text-sm text-gray-900 mt-2">{TEXT.review.intro}</p>
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
                        className={`block hover:ring-2 hover:ring-gray-900 ${markRing(marks[stopLabels[reviewStops.indexOf(cell)]])} ${cell === stop ? CURRENT_STOP_OUTLINE : ""}`}
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

function markRing(mark: ReviewMark | undefined) {
  if (!mark || isDue(mark)) return "";
  return mark.ok ? MARK_RING.ok : MARK_RING.notOk;
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
