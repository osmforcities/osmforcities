"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Feature } from "geojson";
import { useTranslations, useLocale } from "next-intl";
import { MapPin, Users, Circle, Spline, Pentagon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import area from "@turf/area";
import length from "@turf/length";
import type { Dataset } from "@/schemas/dataset";
import { SegmentedBar, type BarSegment } from "@/components/ui/segmented-bar";

type DatasetPanelStatsProps = {
  dataset: Dataset;
};

// Property keys carried by osmtogeojson output that are NOT real OSM tags — the
// combined id, the "@"-prefixed internals, per-element metadata, and app-added
// fields. Mirrors the filters in feature-detail-panel.tsx so the tag list counts
// only genuine tags.
const NON_TAG_KEYS = new Set([
  "id",
  "user",
  "timestamp",
  "version",
  "changeset",
  "ageCategory",
  "uid",
]);

const DAY = 86_400_000;

// Exclusive recency bands, matching the cutoffs used server-side in
// dataset-snapshot.ts (90 days, 365 days, 730 days).
function ageBand(ageMs: number): 0 | 1 | 2 | 3 {
  const days = ageMs / DAY;
  if (days <= 90) return 0;
  if (days <= 365) return 1;
  if (days <= 730) return 2;
  return 3;
}

const RECENCY_COLORS = [
  "bg-olive-600",
  "bg-olive-400",
  "bg-gray-300",
  "bg-gray-200",
] as const;

export function DatasetPanelStats({ dataset }: DatasetPanelStatsProps) {
  const t = useTranslations("DatasetPage");
  const locale = useLocale();
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  // Single pass over the dataset geojson derives every bar on the panel. Same
  // deterministic, SSR-safe pattern as the map's own feature processing; null
  // when the dataset ships stats but no geojson (very large datasets).
  const derived = useMemo(() => {
    const gj = dataset.geojson as { features?: Feature[] } | null;
    if (!gj || !Array.isArray(gj.features) || gj.features.length === 0) {
      return null;
    }
    const features = gj.features;
    const now = Date.now();

    // Keys used by the template's Overpass query (e.g. "highway=bus_stop" ->
    // "highway"). They match ~100% of features by definition, so exclude them
    // from the Most-used-tags list where they'd only crowd out real signal.
    const queryKeys = new Set<string>();
    for (const kv of dataset.template.tags ?? []) {
      for (const cond of kv.split(/[;&]/)) {
        const key = cond.split("=")[0]?.trim();
        if (key) queryKeys.add(key);
      }
    }

    let points = 0;
    let lines = 0;
    let areas = 0;
    let lineKm = 0;
    let areaKm2 = 0;
    const tagCounts = new Map<string, number>();
    const editorLatest = new Map<string, number>();
    const featureBands = [0, 0, 0, 0];
    let timestamped = 0;

    for (const f of features) {
      const geomType = f.geometry?.type;
      if (geomType === "Point" || geomType === "MultiPoint") {
        points++;
      } else if (geomType === "LineString" || geomType === "MultiLineString") {
        lines++;
        try {
          lineKm += length(f);
        } catch {
          /* skip malformed geometry */
        }
      } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
        areas++;
        try {
          areaKm2 += area(f) / 1_000_000;
        } catch {
          /* skip malformed geometry */
        }
      }

      const props = (f.properties ?? {}) as Record<string, unknown>;

      for (const key in props) {
        if (key.startsWith("@") || NON_TAG_KEYS.has(key) || queryKeys.has(key))
          continue;
        tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }

      const tsRaw = props["timestamp"];
      if (typeof tsRaw === "string") {
        const ts = Date.parse(tsRaw);
        if (!Number.isNaN(ts)) {
          featureBands[ageBand(now - ts)]++;
          timestamped++;
          const user = props["user"];
          if (typeof user === "string") {
            const prev = editorLatest.get(user);
            if (prev === undefined || ts > prev) editorLatest.set(user, ts);
          }
        }
      }
    }

    const total = features.length;

    const sortedTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, pct: (count / total) * 100 }));

    const editorBands = [0, 0, 0, 0];
    for (const ts of editorLatest.values()) editorBands[ageBand(now - ts)]++;

    return {
      total,
      points,
      lines,
      areas,
      lineKm,
      areaKm2,
      sortedTags,
      // Percentages of the timestamped features, so the four bands sum to 100.
      featureBandPct: featureBands.map((c) =>
        timestamped > 0 ? (c / timestamped) * 100 : 0
      ),
      timestamped,
      editorBands,
      editorTotal: editorLatest.size,
    };
  }, [dataset.geojson, dataset.template.tags]);

  // Group tags that share the same displayed percentage onto one line, capped
  // at five lines, so the section stays dense but shows more than five tags.
  const tagGroups = useMemo(() => {
    if (!derived) return [];
    const MAX_LINES = 5;
    const MAX_KEYS = 4;
    const groups: { label: string; keys: string[]; pct: number; extra: number }[] =
      [];
    for (const { key, pct } of derived.sortedTags) {
      const label = formatPct(pct);
      let g = groups[groups.length - 1];
      if (!g || g.label !== label) {
        if (groups.length >= MAX_LINES) break;
        g = { label, keys: [], pct, extra: 0 };
        groups.push(g);
      }
      if (g.keys.length < MAX_KEYS) g.keys.push(key);
      else g.extra++;
    }
    return groups;
  }, [derived]);

  const recencyLabels = [
    t("band90d"),
    t("band90dTo1y"),
    t("band1yTo2y"),
    t("band2yPlus"),
  ];

  // --- Overview -----------------------------------------------------------
  // Geometry types share the panel's olive palette (600/400/200) rather than a
  // separate categorical set — the legend icons carry the point/line/area
  // meaning, so color only needs to separate the three slices.
  const geomItems = derived
    ? [
        {
          pct: (derived.points / derived.total) * 100,
          colorClass: "bg-olive-600",
          textClass: "text-olive-600",
          icon: Circle,
          label: t("geomPoints"),
          value: nf.format(derived.points),
          sub: undefined as string | undefined,
        },
        {
          pct: (derived.lines / derived.total) * 100,
          colorClass: "bg-olive-400",
          textClass: "text-olive-400",
          icon: Spline,
          label: t("geomLines"),
          value: nf.format(derived.lines),
          sub:
            derived.lines > 0 ? `${formatKm(derived.lineKm, nf)} km` : undefined,
        },
        {
          pct: (derived.areas / derived.total) * 100,
          colorClass: "bg-olive-300",
          textClass: "text-olive-300",
          icon: Pentagon,
          label: t("geomAreas"),
          value: nf.format(derived.areas),
          sub:
            derived.areas > 0
              ? `${formatKm(derived.areaKm2, nf)} km²`
              : undefined,
        },
      ]
    : null;
  const geomSegments: BarSegment[] | null = geomItems
    ? geomItems.map(({ pct, colorClass, label, value }) => ({
        pct,
        colorClass,
        label,
        value,
      }))
    : null;

  // --- Freshness (recency of each feature's last edit) --------------------
  // Prefer the per-feature geojson timestamps; fall back to the stored
  // cumulative percentages (3-band) when geojson is absent.
  const stale = dataset.stats?.qualityMetrics?.staleElementsPercentage;
  const within1y = dataset.stats?.qualityMetrics?.recentlyUpdatedElementsPercentage;
  let freshnessSegments: BarSegment[] | null = null;
  if (derived && derived.timestamped > 0) {
    freshnessSegments = derived.featureBandPct.map((pct, i) => ({
      pct,
      colorClass: RECENCY_COLORS[i],
      label: recencyLabels[i],
      value: formatPct(pct),
    }));
  } else if (stale != null && within1y != null) {
    const midPct = Math.max(0, 100 - within1y - stale);
    freshnessSegments = [
      {
        pct: within1y,
        colorClass: RECENCY_COLORS[1],
        label: t("bandWithin1y"),
        value: formatPct(within1y),
      },
      {
        pct: midPct,
        colorClass: RECENCY_COLORS[2],
        label: t("band1yTo2y"),
        value: formatPct(midPct),
      },
      {
        pct: stale,
        colorClass: RECENCY_COLORS[3],
        label: t("band2yPlus"),
        value: formatPct(stale),
      },
    ];
  }

  // --- Mappers (recency of each mapper's latest edit) --------------------
  const mappersSegments: BarSegment[] | null =
    derived && derived.editorTotal > 0
      ? derived.editorBands.map((count, i) => ({
          pct: (count / derived.editorTotal) * 100,
          colorClass: RECENCY_COLORS[i],
          label: recencyLabels[i],
          value: nf.format(count),
        }))
      : null;

  const editors = dataset.stats?.editorsCount;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Mappers — moved above Features so the feature-describing blocks (type,
          freshness, tags) stay together below. First recency bar on the panel,
          so it carries the shared recency legend. Edits ride in the headline. */}
      <Section>
        <Headline
          value={editors != null ? nf.format(editors) : "—"}
          unit={t("unitMappers")}
          icon={Users}
        />
        {mappersSegments && (
          <SubBlock eyebrow={t("mappersActiveRecently")}>
            <SegmentedBar
              segments={mappersSegments}
              showLegend={false}
              ariaLabel={t("mappersActiveRecently")}
            />
            <RecencyLegend labels={recencyLabels} />
          </SubBlock>
        )}
      </Section>

      {/* Features — the main stat, then three sub-blocks that all describe the
          features themselves: geometry mix, edit recency, and tag coverage. */}
      <Section>
        <Headline
          value={nf.format(dataset.dataCount)}
          unit={t("unitFeatures")}
          icon={MapPin}
        />
        {geomSegments && geomItems && (
          <SubBlock eyebrow={t("featuresByType")}>
            <SegmentedBar
              segments={geomSegments}
              showLegend={false}
              ariaLabel={t("featuresByType")}
            />
            <GeomLegend items={geomItems} />
          </SubBlock>
        )}
        {freshnessSegments && (
          <SubBlock eyebrow={t("featuresRecentlyEdited")}>
            <SegmentedBar
              segments={freshnessSegments}
              showLegend={false}
              ariaLabel={t("featuresRecentlyEdited")}
            />
            <RecencyLegend labels={recencyLabels} />
          </SubBlock>
        )}
        {tagGroups.length > 0 && (
          <SubBlock
            eyebrow={t("mostUsedTags")}
            className="border-t border-gray-200 pt-3"
          >
            <div className="flex flex-col gap-1.5">
              {tagGroups.map((g) => (
                <div key={g.label} className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-gray-900">
                    {g.keys.join(" · ")}
                    {g.extra > 0 && (
                      <span className="text-gray-400">{` +${g.extra}`}</span>
                    )}
                  </code>
                  <div className="h-1 w-14 flex-none overflow-hidden rounded-full bg-olive-100">
                    <span
                      className="block h-full rounded-full bg-olive-500"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                  <span className="w-9 flex-none text-right text-[11px] tabular-nums text-gray-500">
                    {g.label}
                  </span>
                </div>
              ))}
            </div>
          </SubBlock>
        )}
      </Section>
    </div>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">
          {eyebrow}
        </p>
      )}
      {children}
    </section>
  );
}

// An eyebrow-labeled block nested inside a section (e.g. "Features by type").
// Lighter than a full Section — used for the sub-bars under Features.
function SubBlock({
  eyebrow,
  children,
  className,
}: {
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ""}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">
        {eyebrow}
      </p>
      {children}
    </div>
  );
}

// The recency color scale, shown once and shared by every recency bar on the
// panel (feature freshness + mapper activity use identical buckets and colors).
function RecencyLegend({ labels }: { labels: string[] }) {
  return (
    <div className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-gray-400">
      {labels.map((label, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={`size-2 flex-none rounded-sm ${RECENCY_COLORS[i]}`}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

// Compact geometry legend: one colored glyph per type (point/line/area) instead
// of words, matching each bar slice's color. Counts are dropped (the bar already
// shows the proportion); only the total length/area — which lives nowhere else —
// rides along as a muted sub.
function GeomLegend({
  items,
}: {
  items: {
    icon: LucideIcon;
    textClass: string;
    label: string;
    sub?: string;
  }[];
}) {
  return (
    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
      {items.map(({ icon: Icon, textClass, label, sub }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <Icon className={`size-3.5 flex-none ${textClass}`} aria-label={label} />
          {sub != null && <span className="tabular-nums">{sub}</span>}
        </span>
      ))}
    </div>
  );
}

function Headline({
  value,
  unit,
  icon: Icon,
}: {
  value: string;
  unit: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-[13px] font-semibold text-gray-500">{unit}</span>
      <Icon className="ml-auto size-5 self-center text-olive-600" aria-hidden />
    </div>
  );
}

// One decimal below 10, whole numbers above; a nonzero total that would round
// to 0 shows "<0.1" so a handful of tiny features doesn't read as "0".
function formatKm(n: number, nf: Intl.NumberFormat): string {
  if (n > 0 && n < 0.05) return "<0.1";
  const v = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return nf.format(v);
}

function formatPct(pct: number): string {
  // Keep a decimal for near-full values so they don't misleadingly read "100%".
  if (pct > 0 && pct < 100 && Math.round(pct) === 100) {
    return `${pct.toFixed(1)}%`;
  }
  return `${Math.round(pct)}%`;
}
