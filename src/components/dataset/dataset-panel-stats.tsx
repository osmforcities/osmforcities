"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Feature } from "geojson";
import { useTranslations, useLocale } from "next-intl";
import { MapPin, Users, Target, Spline, Pentagon, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Dataset } from "@/schemas/dataset";
import { SegmentedBar, type BarSegment } from "@/components/ui/segmented-bar";
import { formatCompactNumber } from "@/lib/dataset-stats";
import { computeRecencyBands, RECENCY_BANDS } from "@/lib/dataset-recency";
import { computeGeometryMix } from "@/lib/dataset-geometry";
import { tagLabel, type MessageResolver } from "@/lib/tag-i18n";

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

type GeomItem = {
  count: number;
  pct: number;
  colorClass: string;
  textClass: string;
  icon: LucideIcon;
  filled: boolean;
  label: string;
  // Lowercase singular/plural noun for count-led tooltip rows ("134 points").
  lowerLabel: string;
  display: string;
  // Linear/area measure string for the hover detail (e.g. "142.4 km",
  // "8.3 km²"); null for points, whose measure is just the count.
  measure: string | null;
  // Shown in the legend when count is 0 (e.g. "no lines").
  noneLabel: string;
};

// One color per RECENCY_BANDS entry, in order (freshest olive -> oldest gray).
const RECENCY_COLORS = [
  "bg-olive-500",
  "bg-olive-400",
  "bg-gray-300",
  "bg-gray-200",
] as const;

export function DatasetPanelStats({ dataset }: DatasetPanelStatsProps) {
  const t = useTranslations("DatasetPage");
  const tTagLabel = useTranslations("TagLabel") as unknown as MessageResolver;
  const locale = useLocale();
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  // Joins absent geometry types ("lines or areas") when 2+ are absent, so the
  // tooltip can fold them into one muted row instead of two near-duplicates.
  const listFormat = useMemo(
    () => new Intl.ListFormat(locale, { type: "disjunction" }),
    [locale]
  );

  // Panel bars derived from the geojson; null when none is shipped.
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

    const tagCounts = new Map<string, number>();
    for (const f of features) {
      const props = (f.properties ?? {}) as Record<string, unknown>;
      for (const key in props) {
        if (key.startsWith("@") || NON_TAG_KEYS.has(key) || queryKeys.has(key))
          continue;
        tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }
    }

    const total = features.length;

    const sortedTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, pct: (count / total) * 100 }));

    // Same helpers the server uses, so these match the stored values.
    const { editRecencyBands, mapperRecencyBands } = computeRecencyBands(
      features,
      now
    );
    const geometryMix = computeGeometryMix(features);

    return {
      sortedTags,
      editRecencyBands,
      mapperRecencyBands,
      geometryMix,
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

  // Critical-tag coverage: for each of the template's filterable (curated) tags,
  // the share of features that carry it. Absent tags read 0% — that gap is the
  // signal. Replaces the Most-used list for templates that curate a list.
  const coverageItems = useMemo(() => {
    const filterable = dataset.template.filterableTags ?? [];
    if (!derived || filterable.length === 0) return [];
    const pctByKey = new Map(derived.sortedTags.map((s) => [s.key, s.pct]));
    return filterable
      .map((key) => ({
        key,
        label: tagLabel(tTagLabel, key),
        pct: pctByKey.get(key) ?? 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [derived, dataset.template.filterableTags, tTagLabel]);

  const recencyLabels = RECENCY_BANDS.map((band) => t(band.labelKey));

  // --- Geometry mix -------------------------------------------------------
  // A stacked proportion bar (like the recency bars), with a compact legend
  // beneath. Geometry types use the olive ramp capped at the button color
  // (500/400/300); the legend icons carry the point/line/area meaning, so color
  // only needs to separate the slices. The legend always lists all three types:
  // points show their count, lines their total length, areas their total area;
  // absent types read "no lines" etc. Hovering/focusing the whole bar reveals a
  // `detail` breakdown (count + share% + measure per present type).
  // Persisted mix if present, else derived from geojson; its own total is the
  // bar denominator, so the section is self-contained.
  const geometryMix = dataset.stats?.geometryMix ?? derived?.geometryMix ?? null;
  const geomTotal = geometryMix?.total ?? 0;
  const geomItems: GeomItem[] | null = geometryMix
    ? [
        {
          count: geometryMix.points,
          pct: (geometryMix.points / geomTotal) * 100,
          colorClass: "bg-olive-500",
          textClass: "text-olive-500",
          icon: Target,
          filled: false,
          label: t("geomPoints"),
          lowerLabel: t("geomPointsLower"),
          display: formatCompactNumber(geometryMix.points),
          measure: null,
          noneLabel: t("geomNone", { type: t("geomPointsLower") }),
        },
        {
          count: geometryMix.lines,
          pct: (geometryMix.lines / geomTotal) * 100,
          colorClass: "bg-olive-400",
          textClass: "text-olive-400",
          icon: Spline,
          filled: false,
          label: t("geomLines"),
          lowerLabel: t("geomLinesLower"),
          display: formatLength(geometryMix.lineKm, nf),
          measure: formatLength(geometryMix.lineKm, nf),
          noneLabel: t("geomNone", { type: t("geomLinesLower") }),
        },
        {
          count: geometryMix.areas,
          pct: (geometryMix.areas / geomTotal) * 100,
          colorClass: "bg-olive-300",
          textClass: "text-olive-300",
          icon: Pentagon,
          filled: false,
          label: t("geomAreas"),
          lowerLabel: t("geomAreasLower"),
          display: formatArea(geometryMix.areaKm2, nf),
          measure: formatArea(geometryMix.areaKm2, nf),
          noneLabel: t("geomNone", { type: t("geomAreasLower") }),
        },
      ]
    : null;
  // The bar shows only present types (a single type fills it 100%); the legend
  // below carries the full three-type breakdown, including the absent ones.
  const geomPresent = geomItems ? geomItems.filter((g) => g.count > 0) : [];
  const geomSegments: BarSegment[] | null =
    geomPresent.length > 0
      ? geomPresent.map(({ pct, colorClass, label, display }) => ({
          pct,
          colorClass,
          label,
          value: display,
        }))
      : null;
  // Full breakdown shown on press/tap/keyboard of the whole bar (one large
  // target, rather than sliver-thin per-slice hit areas). The total leads
  // (BLUF) since every row's % is relative to it. Each present row is
  // count-led ("134 points") so the row states what it is without a separate
  // count column; lines/areas add a measure sub-line ("80.7 ha total") since
  // a row of counts alone can't say how long/large that geometry actually is.
  // Absent types collapse to one muted row: a single absent type reads
  // "No lines"; two collapse into one line via Intl.ListFormat ("No lines or
  // areas") rather than two near-duplicate lines once the bar is visibly one
  // solid color.
  const geomAbsent = geomItems ? geomItems.filter((g) => g.count === 0) : [];
  const geomAbsentLine =
    geomAbsent.length === 0
      ? null
      : geomAbsent.length === 1
        ? capitalize(geomAbsent[0].noneLabel)
        : capitalize(
            t("geomNone", {
              type: listFormat.format(geomAbsent.map((g) => g.lowerLabel)),
            })
          );
  const geomDetail = geomItems ? (
    <div className="flex flex-col gap-2">
      <p className="border-b border-white/15 pb-1.5 tabular-nums text-gray-400">
        {t("geomTotalFeatures", { count: geomTotal })}
      </p>
      <div className="flex flex-col gap-2">
        {geomItems
          .filter((g) => g.count > 0)
          .map(({ label, lowerLabel, count, pct, measure, colorClass }) => (
            <div key={label} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <span
                    aria-hidden
                    className={`size-1.5 flex-none rounded-full ${colorClass}`}
                  />
                  {`${nf.format(count)} ${lowerLabel}`}
                </span>
                <span className="whitespace-nowrap tabular-nums text-white">
                  {formatPct(pct)}
                </span>
              </div>
              {measure && (
                <p className="pl-3 tabular-nums text-gray-400">
                  {t("geomMeasureTotal", { measure })}
                </p>
              )}
            </div>
          ))}
        {geomAbsentLine && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <span
              aria-hidden
              className="size-1.5 flex-none rounded-full bg-gray-600"
            />
            {geomAbsentLine}
          </div>
        )}
      </div>
    </div>
  ) : null;

  // --- Freshness (recency of each feature's last edit) --------------------
  // Priority: persisted bands -> geojson-derived -> legacy 3-band qualityMetrics.
  const editBands =
    bandsIfPopulated(dataset.stats?.editRecencyBands) ??
    bandsIfPopulated(derived?.editRecencyBands);
  const stale = dataset.stats?.qualityMetrics?.staleElementsPercentage;
  const within1y = dataset.stats?.qualityMetrics?.recentlyUpdatedElementsPercentage;
  let freshnessSegments: BarSegment[] | null = null;
  if (editBands) {
    freshnessSegments = recencyBandSegments(editBands, recencyLabels, formatPct);
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
  const mapperBands =
    bandsIfPopulated(dataset.stats?.mapperRecencyBands) ??
    bandsIfPopulated(derived?.mapperRecencyBands);
  const mappersSegments: BarSegment[] | null = mapperBands
    ? recencyBandSegments(mapperBands, recencyLabels, (_pct, count) =>
        nf.format(count)
      )
    : null;

  const editors = dataset.stats?.editorsCount;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Features — the headline stat, given top billing. Two sub-blocks
          describe the features: geometry mix and edit recency, separated by a
          light intra-section rule. */}
      <Section>
        <SectionHeader
          title={t("titleFeatures")}
          value={formatCompactNumber(dataset.dataCount)}
          icon={MapPin}
        />
        {geomSegments && geomItems && (
          <SubBlock eyebrow={t("geometryMix")}>
            <SegmentedBar
              segments={geomSegments}
              showLegend={false}
              ariaLabel={t("geometryMix")}
              detail={geomDetail}
            />
            <GeomLegend items={geomItems} />
          </SubBlock>
        )}
        {freshnessSegments && (
          <SubBlock eyebrow={t("recentlyEdited")} unit="%" spaced>
            <SegmentedBar
              segments={freshnessSegments}
              showLegend={false}
              ariaLabel={t("recentlyEdited")}
            />
            <RecencyLegend labels={recencyLabels} />
          </SubBlock>
        )}
      </Section>

      {/* Mappers — secondary to Features; its recency bar reuses the shared
          recency legend/colors. */}
      <Section>
        <SectionHeader
          title={t("titleMappers")}
          value={editors != null ? formatCompactNumber(editors) : "—"}
          icon={Users}
        />
        {mappersSegments && (
          <SubBlock eyebrow={t("activeRecently")} unit="%">
            <SegmentedBar
              segments={mappersSegments}
              showLegend={false}
              ariaLabel={t("activeRecently")}
            />
            <RecencyLegend labels={recencyLabels} />
          </SubBlock>
        )}
      </Section>

      {/* Tags — its own section: a leading tag icon + title, then the ranked
          key-presence list. */}
      {(coverageItems.length > 0 || tagGroups.length > 0) && (
        <Section>
          <SectionHeader title={t("titleTags")} icon={Tag} />
          {coverageItems.length > 0 ? (
            <SubBlock eyebrow={t("tagCoverage")}>
              <div className="flex flex-col gap-1.5">
                {coverageItems.map((c) => (
                  <StatRow
                    key={c.key}
                    pct={c.pct}
                    leading={
                      <span className="block truncate text-[12px] text-gray-700">
                        {c.label}
                      </span>
                    }
                    value={formatPct(c.pct)}
                  />
                ))}
              </div>
            </SubBlock>
          ) : (
            <SubBlock eyebrow={t("mostUsedTags")}>
              <div className="flex flex-col gap-1.5">
                {tagGroups.map((g) => (
                  <StatRow
                    key={g.label}
                    pct={g.pct}
                    leading={
                      <code className="block truncate font-mono text-[11.5px] text-gray-900">
                        {g.keys.join(" · ")}
                        {g.extra > 0 && (
                          <span className="text-gray-400">{` +${nf.format(g.extra)}`}</span>
                        )}
                      </code>
                    }
                    value={g.label}
                  />
                ))}
              </div>
            </SubBlock>
          )}
        </Section>
      )}
    </div>
  );
}

// A top-level panel section, rendered as a separated white card sitting in the
// tinted stats well (see dataset-interactive-section). Cards self-separate via
// the root flex `gap-4`.
function Section({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      {children}
    </section>
  );
}

// An eyebrow-labeled block nested inside a section card (e.g. "By type"). `unit`
// renders a muted marker on the right of the eyebrow (e.g. "%") to signal what
// the bar's proportions represent when the bar itself shows no numbers.
function SubBlock({
  eyebrow,
  unit,
  children,
  className,
  spaced,
}: {
  eyebrow: string;
  unit?: string;
  children: ReactNode;
  className?: string;
  // Adds extra top space when this block follows another chart in the same card.
  // The card outline already frames the group, so sub-sections separate with
  // whitespace + their eyebrow labels rather than an internal rule.
  spaced?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5${spaced ? " mt-2.5" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <p className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">
        <span>{eyebrow}</span>
        {unit && (
          <span className="font-semibold normal-case tracking-normal text-gray-300">
            {unit}
          </span>
        )}
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

// Compact geometry legend: one colored glyph per type, always listing all three.
// Present types show count (+ km/km² for lines/areas); absent types read
// "no lines" etc. and are dimmed so the present ones lead.
function GeomLegend({ items }: { items: GeomItem[] }) {
  return (
    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
      {items.map(({ icon: Icon, textClass, filled, label, display, noneLabel, count }) => (
        <span
          key={label}
          className={`inline-flex items-center gap-1.5${count === 0 ? " opacity-60" : ""}`}
        >
          <Icon
            className={`size-3.5 flex-none ${filled ? "fill-current " : ""}${
              count === 0 ? "text-gray-300" : textClass
            }`}
            aria-label={label}
          />
          <span className="tabular-nums">{count > 0 ? display : noneLabel}</span>
        </span>
      ))}
    </div>
  );
}

// A list row used by the Most-used-tags section: a leading label (tag key), a
// share bar, and a right-aligned value.
function StatRow({
  leading,
  pct,
  value,
  valueClassName = "w-9",
}: {
  leading: ReactNode;
  pct: number;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{leading}</div>
      <div className="h-1 w-14 flex-none overflow-hidden rounded-full bg-olive-100">
        <span
          className="block h-full rounded-full bg-olive-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span
        className={`flex-none text-right text-[11px] tabular-nums text-gray-500 ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}

// Section header: title (left) is the dominant label that anchors the section;
// the headline number is secondary (smaller); the icon always trails on the
// right. `value` is optional — number-less sections (Tags) keep the same rhythm.
function SectionHeader({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <h3 className="text-lg font-semibold leading-tight text-gray-900">
        {title}
      </h3>
      {value != null && (
        <span className="ml-auto text-[15px] font-bold tabular-nums text-gray-600">
          {value}
        </span>
      )}
      <Icon
        className={`size-[18px] self-center text-olive-500${
          value == null ? " ml-auto" : ""
        }`}
        aria-hidden
      />
    </div>
  );
}

// One decimal below 100, whole numbers above.
function round1(n: number): number {
  return n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
}

// Adaptive length: metres under 1 km, kilometres above. Keeps small totals
// legible ("850 m") instead of collapsing to "0.9 km".
function formatLength(km: number, nf: Intl.NumberFormat): string {
  if (km <= 0) return `0 m`;
  if (km < 1) return `${nf.format(Math.round(km * 1000))} m`;
  return `${nf.format(round1(km))} km`;
}

// Adaptive area: m² under 1 ha, hectares under 1 km², km² above — so a few
// building footprints read "8,400 m²" or "3.2 ha" rather than "0 km²".
function formatArea(km2: number, nf: Intl.NumberFormat): string {
  if (km2 <= 0) return `0 m²`;
  if (km2 < 0.01) return `${nf.format(Math.round(km2 * 1_000_000))} m²`;
  if (km2 < 1) return `${nf.format(round1(km2 * 100))} ha`;
  return `${nf.format(round1(km2))} km²`;
}

// The legend uses noneLabel lowercase, inline after an icon ("no lines"); the
// tooltip shows it as its own line, so it needs sentence case ("No lines").
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPct(pct: number): string {
  // A nonzero share that rounds down to 0 would misleadingly read as "gone" —
  // e.g. "1 (0%)" contradicts itself. Mirrors the near-100 case below, which
  // exists for the same reason at the other end of the scale.
  if (pct > 0 && pct < 1) return "<1%";
  // Keep a decimal for near-full values so they don't misleadingly read "100%".
  if (pct > 0 && pct < 100 && Math.round(pct) === 100) {
    return `${pct.toFixed(1)}%`;
  }
  return `${Math.round(pct)}%`;
}

// Well-formed, non-empty band array or null (all-zero = no signal, fall through).
function bandsIfPopulated(bands: number[] | undefined): number[] | null {
  if (!bands || bands.length !== RECENCY_BANDS.length) return null;
  return bands.some((c) => c > 0) ? bands : null;
}

// Percentages are of the band sum, so the bands total 100%.
function recencyBandSegments(
  bands: number[],
  labels: string[],
  formatValue: (pct: number, count: number) => string
): BarSegment[] {
  const total = bands.reduce((a, b) => a + b, 0);
  return bands.map((count, i) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return {
      pct,
      colorClass: RECENCY_COLORS[i],
      label: labels[i],
      value: formatValue(pct, count),
    };
  });
}
