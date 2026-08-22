"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { Feature } from "geojson";
import {
  DEFAULT_STYLE_KNOBS,
  ageCase,
  buildLineWidth,
  buildPointRadiusForCount,
  buildPointStrokeWidth,
  buildPolygonStrokeWidth,
  type AgeCategoryColors,
  type AgeCategoryValues,
  type MapStyleKnobs,
} from "./layers/map-style";
import { createSmallPolygonProxyPoints } from "./layers/polygon-proxy-points";
import {
  POLYGON_LAYER_ID,
  POLYGON_STROKE_LAYER_ID,
  LINE_LAYER_ID,
  POINT_LAYER_ID,
  PROXY_LAYER_ID,
} from "./layers/layer-ids";

type AgeCategory = keyof AgeCategoryValues<number>;

const AGE_CATEGORIES: { key: AgeCategory; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "medium", label: "Medium" },
  { key: "older", label: "Older" },
  { key: "very-old", label: "Very old" },
];

// Candidate age palettes for the palette dropdown. All keep contrast against
// the washed basemap; the high-contrast group keeps chroma on every step so
// the very-old majority never fades out
const AGE_PALETTES: Record<string, AgeCategoryColors> = {
  // CARTO BluGrn (previous default; pale light end lost the very-old dots)
  "blu-grn": {
    recent: "#1d4f60",
    medium: "#36877a",
    older: "#6dbc90",
    "very-old": "#c4e6c3",
  },
  // Hand-built single-hue teal, palest light end
  "teal-ramp": {
    recent: "#0f5c54",
    medium: "#2f9e8f",
    older: "#7fb8ad",
    "very-old": "#cbd5d1",
  },
  // ColorBrewer BuGn (blue-green, warmer light end)
  bugn: {
    recent: "#238b45",
    medium: "#66c2a4",
    older: "#b2e2e2",
    "very-old": "#e5f5f9",
  },
  // CARTO DarkMint (deeper, bluer dark end)
  "dark-mint": {
    recent: "#123f5a",
    medium: "#3a7c89",
    older: "#7bbcb0",
    "very-old": "#d2fbd4",
  },
  // The four below skip the palest ramp steps so the very-old majority
  // keeps enough chroma to stay visible against the washed basemap
  // CARTO Emrld (saturated green light end)
  emrld: {
    recent: "#105965",
    medium: "#4c9b82",
    older: "#6cc08b",
    "very-old": "#97e196",
  },
  // CARTO Teal (steely, most muted light end of this group)
  teal: {
    recent: "#2a5674",
    medium: "#4f90a6",
    older: "#85c4c9",
    "very-old": "#a8dbd9",
  },
  // ColorBrewer YlGnBu (blue dark end, warm green-yellow light end)
  ylgnbu: {
    recent: "#225ea8",
    medium: "#41b6c4",
    older: "#7fcdbb",
    "very-old": "#c7e9b4",
  },
  // ColorBrewer GnBu (strong blue dark end, minty light end)
  gnbu: {
    recent: "#08589e",
    medium: "#4eb3d3",
    older: "#7bccc4",
    "very-old": "#a8ddb5",
  },
  // Viridis picks: multi-hue, colorblind safe, no step washes out
  // (the baked default)
  viridis: DEFAULT_STYLE_KNOBS.colors,
  // CARTO Sunset picks: purple recent -> amber old, warm against cool basemap
  sunset: {
    recent: "#5c53a5",
    medium: "#a059a0",
    older: "#eb7f86",
    "very-old": "#fac484",
  },
  // Context-vs-accent: old features are visible neutral slates, color is
  // spent entirely on recency (brand-adjacent greens)
  "slate-accent": {
    recent: "#14532d",
    medium: "#15803d",
    older: "#64748b",
    "very-old": "#94a3b8",
  },
  // ColorBrewer Blues compressed into the mid-dark range; very-old is a
  // full mid-tone, not a tint
  blues: {
    recent: "#08306b",
    medium: "#2171b5",
    older: "#6baed6",
    "very-old": "#9ecae1",
  },
};

// Dev-only live style tuner: writes straight to the map with
// setPaintProperty, so knob changes restyle instantly without a recompile.
// Tuned values are exported via "Copy values" and pasted back into
// DEFAULT_STYLE_KNOBS in map-style.ts.

// Dev-only UI, intentionally not translated
const TEXT = {
  tune: "Tune",
  title: "Style tuning",
  close: "Close",
  palette: "Palette",
  custom: "custom",
  reset: "Reset",
  copy: "Copy values",
  copied: "Copied",
};

type StyleTuningPanelProps = {
  features: Feature[];
};

function Knob({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-gray-600">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
      />
      <span className="w-8 shrink-0 text-right tabular-nums text-gray-900">
        {value}
      </span>
    </label>
  );
}

function ColorKnob({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-gray-600">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
      />
      <span className="tabular-nums text-gray-900">{value}</span>
    </label>
  );
}

function Group({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="border-t border-gray-100 pt-1">
      <summary className="cursor-pointer select-none text-xs font-medium text-gray-900">
        {title}
      </summary>
      <div className="mt-1 space-y-1">{children}</div>
    </details>
  );
}

function StyleTuningPanelInner({ features }: StyleTuningPanelProps) {
  const { current: mapRef } = useMap();
  const [open, setOpen] = useState(false);
  const [knobs, setKnobs] = useState<MapStyleKnobs>(DEFAULT_STYLE_KNOBS);
  const [zoom, setZoom] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Density-aware radius needs the same counts the baked layers use: point
  // features for detailed-points, proxy centroids for polygon-proxy-points
  const { pointCount, proxyPointCount } = useMemo(() => {
    const polygonFeatures = features.filter(
      (f) =>
        f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
    );
    return {
      pointCount: features.filter((f) => f.geometry?.type === "Point").length,
      proxyPointCount: createSmallPolygonProxyPoints(polygonFeatures).length,
    };
  }, [features]);

  const update = useCallback((mutate: (draft: MapStyleKnobs) => void) => {
    setKnobs((prev) => {
      const next = structuredClone(prev);
      mutate(next);
      return next;
    });
  }, []);

  // Zoom readout so stop values (z12/z15/z18) can be judged in context
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onMove = () => setZoom(map.getZoom());
    onMove();
    map.on("move", onMove);
    return () => {
      map.off("move", onMove);
    };
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    // Layers mount conditionally per geometry type, hence the getLayer guard
    const setPaint = (layer: string, prop: string, value: unknown) => {
      if (map.getLayer(layer)) {
        map.setPaintProperty(layer, prop as never, value as never);
      }
    };
    const ageColor = ageCase(knobs.colors);

    setPaint("basemap-mute", "background-opacity", knobs.basemapWashOpacity);

    setPaint(
      POINT_LAYER_ID,
      "circle-radius",
      buildPointRadiusForCount(pointCount, knobs)
    );
    setPaint(POINT_LAYER_ID, "circle-color", ageColor);
    setPaint(POINT_LAYER_ID, "circle-opacity", ageCase(knobs.point.opacity));
    setPaint(
      POINT_LAYER_ID,
      "circle-stroke-width",
      buildPointStrokeWidth(knobs)
    );
    setPaint(POINT_LAYER_ID, "circle-stroke-color", knobs.point.strokeColor);

    // Proxy circles share the point look; their fade opacity stays untouched
    setPaint(
      PROXY_LAYER_ID,
      "circle-radius",
      buildPointRadiusForCount(proxyPointCount, knobs)
    );
    setPaint(
      PROXY_LAYER_ID,
      "circle-stroke-width",
      buildPointStrokeWidth(knobs)
    );
    setPaint(PROXY_LAYER_ID, "circle-stroke-color", knobs.point.strokeColor);
    setPaint(PROXY_LAYER_ID, "circle-color", ageColor);

    setPaint(LINE_LAYER_ID, "line-color", ageColor);
    setPaint(LINE_LAYER_ID, "line-width", buildLineWidth(knobs));

    setPaint(POLYGON_LAYER_ID, "fill-color", ageColor);
    setPaint(POLYGON_STROKE_LAYER_ID, "line-color", knobs.point.strokeColor);
    setPaint(
      POLYGON_STROKE_LAYER_ID,
      "line-width",
      buildPolygonStrokeWidth(knobs)
    );

    setPaint("aoi-boundary", "line-color", knobs.boundary.color);
    setPaint("aoi-boundary", "line-width", knobs.boundary.width);
    setPaint("aoi-boundary", "line-opacity", knobs.boundary.opacity);
  }, [mapRef, knobs, pointCount, proxyPointCount]);

  const copyValues = () => {
    const payload = JSON.stringify(knobs, null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-8 left-2 z-10 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm hover:bg-gray-50"
      >
        {TEXT.tune}
      </button>
    );
  }

  return (
    <div className="absolute bottom-8 left-2 z-10 max-h-[70%] w-72 space-y-2 overflow-y-auto rounded-md border border-gray-300 bg-white p-3 shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-900">
          {TEXT.title}
          {zoom !== null ? ` — z${zoom.toFixed(1)}` : ""}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          {TEXT.close}
        </button>
      </div>

      <Group title="Basemap" defaultOpen>
        <Knob
          label="Wash opacity"
          value={knobs.basemapWashOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => update((k) => (k.basemapWashOpacity = v))}
        />
      </Group>

      <Group title="Points" defaultOpen>
        <Knob
          label="Radius z12"
          value={knobs.point.radiusZ12}
          min={0.5}
          max={8}
          step={0.5}
          onChange={(v) => update((k) => (k.point.radiusZ12 = v))}
        />
        <Knob
          label="Radius z15"
          value={knobs.point.radiusZ15}
          min={1}
          max={12}
          step={0.5}
          onChange={(v) => update((k) => (k.point.radiusZ15 = v))}
        />
        <Knob
          label="Radius z18"
          value={knobs.point.radiusZ18}
          min={1}
          max={16}
          step={0.5}
          onChange={(v) => update((k) => (k.point.radiusZ18 = v))}
        />
        <Knob
          label="Stroke z12"
          value={knobs.point.strokeZ12}
          min={0}
          max={2}
          step={0.25}
          onChange={(v) => update((k) => (k.point.strokeZ12 = v))}
        />
        <Knob
          label="Stroke z15"
          value={knobs.point.strokeZ15}
          min={0}
          max={4}
          step={0.5}
          onChange={(v) => update((k) => (k.point.strokeZ15 = v))}
        />
        <ColorKnob
          label="Stroke color"
          value={knobs.point.strokeColor}
          onChange={(v) => update((k) => (k.point.strokeColor = v))}
        />
      </Group>

      <Group title="Radius boost by age" defaultOpen>
        {AGE_CATEGORIES.map(({ key, label }) => (
          <Knob
            key={key}
            label={label}
            value={knobs.radiusBoost[key]}
            min={-2}
            max={6}
            step={0.5}
            onChange={(v) => update((k) => (k.radiusBoost[key] = v))}
          />
        ))}
      </Group>

      <Group title="Opacity by age" defaultOpen>
        {AGE_CATEGORIES.map(({ key, label }) => (
          <Knob
            key={key}
            label={label}
            value={knobs.point.opacity[key]}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => update((k) => (k.point.opacity[key] = v))}
          />
        ))}
      </Group>

      <Group title="Recent emphasis" defaultOpen>
        <Knob
          label="Halo width"
          value={knobs.recent.haloWidth}
          min={0}
          max={4}
          step={0.5}
          onChange={(v) => update((k) => (k.recent.haloWidth = v))}
        />
      </Group>

      <Group title="Age colors" defaultOpen>
        <label className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 text-gray-600">{TEXT.palette}</span>
          <select
            className="min-w-0 flex-1 rounded border border-gray-300 px-1 py-0.5"
            value={
              Object.entries(AGE_PALETTES).find(
                ([, palette]) =>
                  JSON.stringify(palette) === JSON.stringify(knobs.colors)
              )?.[0] ?? "custom"
            }
            onChange={(e) => {
              const palette = AGE_PALETTES[e.target.value];
              if (palette) update((k) => (k.colors = { ...palette }));
            }}
          >
            {Object.keys(AGE_PALETTES).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="custom" disabled>
              {TEXT.custom}
            </option>
          </select>
        </label>
        {AGE_CATEGORIES.map(({ key, label }) => (
          <ColorKnob
            key={key}
            label={label}
            value={knobs.colors[key]}
            onChange={(v) => update((k) => (k.colors[key] = v))}
          />
        ))}
      </Group>

      <Group title="Boundary" defaultOpen>
        <ColorKnob
          label="Color"
          value={knobs.boundary.color}
          onChange={(v) => update((k) => (k.boundary.color = v))}
        />
        <Knob
          label="Width"
          value={knobs.boundary.width}
          min={0.5}
          max={6}
          step={0.5}
          onChange={(v) => update((k) => (k.boundary.width = v))}
        />
        <Knob
          label="Opacity"
          value={knobs.boundary.opacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => update((k) => (k.boundary.opacity = v))}
        />
      </Group>

      <Group title="Lines">
        <Knob
          label="Width z8"
          value={knobs.line.widthZ8}
          min={0.5}
          max={8}
          step={0.5}
          onChange={(v) => update((k) => (k.line.widthZ8 = v))}
        />
        <Knob
          label="Width z13"
          value={knobs.line.widthZ13}
          min={0.5}
          max={8}
          step={0.5}
          onChange={(v) => update((k) => (k.line.widthZ13 = v))}
        />
        <Knob
          label="Width z18"
          value={knobs.line.widthZ18}
          min={1}
          max={16}
          step={0.5}
          onChange={(v) => update((k) => (k.line.widthZ18 = v))}
        />
      </Group>

      <Group title="Polygon stroke">
        <Knob
          label="Width z8"
          value={knobs.polygonStroke.widthZ8}
          min={0.5}
          max={8}
          step={0.5}
          onChange={(v) => update((k) => (k.polygonStroke.widthZ8 = v))}
        />
        <Knob
          label="Width z13"
          value={knobs.polygonStroke.widthZ13}
          min={0.5}
          max={8}
          step={0.5}
          onChange={(v) => update((k) => (k.polygonStroke.widthZ13 = v))}
        />
        <Knob
          label="Width z18"
          value={knobs.polygonStroke.widthZ18}
          min={0.5}
          max={8}
          step={0.5}
          onChange={(v) => update((k) => (k.polygonStroke.widthZ18 = v))}
        />
      </Group>

      <Group title="Interpolation">
        <Knob
          label="Exp base"
          value={knobs.base}
          min={1}
          max={2}
          step={0.05}
          onChange={(v) => update((k) => (k.base = v))}
        />
      </Group>

      <div className="flex gap-2 border-t border-gray-100 pt-2">
        <button
          onClick={copyValues}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
        >
          {copied ? TEXT.copied : TEXT.copy}
        </button>
        <button
          onClick={() => setKnobs(DEFAULT_STYLE_KNOBS)}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
        >
          {TEXT.reset}
        </button>
      </div>
    </div>
  );
}

export function StyleTuningPanel(props: StyleTuningPanelProps) {
  if (process.env.NODE_ENV !== "development") return null;
  return <StyleTuningPanelInner {...props} />;
}
