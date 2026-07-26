"use client";

import { Fragment, useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MapPin, Users, Target, Spline, Pentagon, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Dataset } from "@/schemas/dataset";
import { SegmentedBar, type BarSegment } from "@/components/ui/segmented-bar";
import { formatCompactNumber } from "@/lib/dataset-stats";
import { RECENCY_BANDS } from "@/lib/dataset-recency";
import { tagLabel, type MessageResolver } from "@/lib/tag-i18n";

type DatasetPanelStatsProps = {
  dataset: Dataset;
};

type GeomItem = {
  count: number;
  pct: number;
  colorClass: string;
  textClass: string;
  icon: LucideIcon;
  label: string;
  display: string;
  // null for points, which have no separate measure
  measure: string | null;
  noneLabel: string;
};

// One row of a breakdown popover. `measure` rides in a paren beside the label
// (geometry length/area); null for count-only rows (points, recency bands).
type DetailItem = {
  label: string;
  count: number;
  colorClass: string;
  measure?: string | null;
};

// Indexed like RECENCY_BANDS: freshest -> oldest.
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
  // Compact digits for footprint m² (105K / 105 mil).
  const compactNf = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  const tagCounts = dataset.stats?.tagCounts ?? null;

  // Query keys (e.g. "highway" from "highway=bus_stop") match ~100% of
  // features by definition, so exclude them from Most-used-tags.
  const queryKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const kv of dataset.template.tags ?? []) {
      for (const cond of kv.split(/[;&]/)) {
        const key = cond.split("=")[0]?.trim();
        if (key) keys.add(key);
      }
    }
    return keys;
  }, [dataset.template.tags]);

  // Non-query tags, each with its share of features (count / dataCount).
  const sortedTags = useMemo(() => {
    if (!tagCounts || dataset.dataCount <= 0) return [];
    const total = dataset.dataCount;
    return tagCounts
      .filter((tc) => !queryKeys.has(tc.key))
      .map((tc) => ({ key: tc.key, pct: (tc.count / total) * 100 }));
  }, [tagCounts, queryKeys, dataset.dataCount]);

  // Groups tags sharing the same displayed %, capped at 5 lines.
  const tagGroups = useMemo(() => {
    const MAX_LINES = 5;
    const MAX_KEYS = 4;
    const groups: { label: string; keys: string[]; pct: number; extra: number }[] =
      [];
    for (const { key, pct } of sortedTags) {
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
  }, [sortedTags]);

  // Share of features carrying each of the template's curated tags; absent = 0%.
  const coverageItems = useMemo(() => {
    const filterable = dataset.template.filterableTags ?? [];
    if (!tagCounts || filterable.length === 0 || dataset.dataCount <= 0) return [];
    const total = dataset.dataCount;
    const pctByKey = new Map(
      tagCounts.map((tc) => [tc.key, (tc.count / total) * 100])
    );
    return filterable
      .map((key) => ({
        key,
        label: tagLabel(tTagLabel, key),
        pct: pctByKey.get(key) ?? 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [tagCounts, dataset.dataCount, dataset.template.filterableTags, tTagLabel]);

  const recencyLabels = RECENCY_BANDS.map((band) => t(band.labelKey));

  // --- Geometry mix -------------------------------------------------------
  const geometryMix = dataset.stats?.geometryMix ?? null;
  // Only count-bearing types render a segment (see geomPresent), so this
  // denominator is only ever divided into positive counts.
  const geomTotal = geometryMix
    ? geometryMix.points + geometryMix.lines + geometryMix.areas
    : 0;
  let geomItems: GeomItem[] | null = null;
  if (geometryMix) {
    // Format each measure once; a 0-count type carries no measure, so the
    // popover shows its label alone (never "(0 m)").
    const lineFmt = formatLength(geometryMix.lineKm, nf);
    const areaFmt = formatArea(geometryMix.areaKm2, nf, compactNf);
    geomItems = [
      {
        count: geometryMix.points,
        pct: (geometryMix.points / geomTotal) * 100,
        colorClass: "bg-olive-500",
        textClass: "text-olive-500",
        icon: Target,
        label: t("geomPoints"),
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
        label: t("geomLines"),
        display: lineFmt,
        measure: geometryMix.lines > 0 ? lineFmt : null,
        noneLabel: t("geomNone", { type: t("geomLinesLower") }),
      },
      {
        count: geometryMix.areas,
        pct: (geometryMix.areas / geomTotal) * 100,
        colorClass: "bg-olive-300",
        textClass: "text-olive-300",
        icon: Pentagon,
        label: t("geomAreas"),
        display: areaFmt,
        measure: geometryMix.areas > 0 ? areaFmt : null,
        noneLabel: t("geomNone", { type: t("geomAreasLower") }),
      },
    ];
  }
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

  // --- Freshness ------------------------------------------------------------
  // Persisted bands, else legacy qualityMetrics.
  const editBands = bandsIfPopulated(dataset.stats?.editRecencyBands);
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

  // --- Mappers --------------------------------------------------------------
  const mapperBands = bandsIfPopulated(dataset.stats?.mapperRecencyBands);
  const mappersSegments: BarSegment[] | null = mapperBands
    ? recencyBandSegments(mapperBands, recencyLabels, (_pct, count) =>
        nf.format(count)
      )
    : null;

  const editors = dataset.stats?.editorsCount;

  return (
    <div className="flex flex-1 flex-col gap-4">
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
              detail={
                <BreakdownDetail
                  title={t("detailTitleGeometry")}
                  items={geomItems}
                  totalLabel={t("detailTotal")}
                  nf={nf}
                />
              }
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
              detail={
                editBands && (
                  <BreakdownDetail
                    title={t("detailTitleFreshness")}
                    items={recencyDetailItems(editBands, recencyLabels)}
                    totalLabel={t("detailTotal")}
                    nf={nf}
                  />
                )
              }
            />
            <RecencyLegend labels={recencyLabels} />
          </SubBlock>
        )}
      </Section>

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
              detail={
                mapperBands && (
                  <BreakdownDetail
                    title={t("detailTitleMappers")}
                    items={recencyDetailItems(mapperBands, recencyLabels)}
                    totalLabel={t("detailTotal")}
                    nf={nf}
                  />
                )
              }
            />
            <RecencyLegend labels={recencyLabels} />
          </SubBlock>
        )}
      </Section>

      {(coverageItems.length > 0 || tagGroups.length > 0) && (
        <Section>
          <SectionHeader title={t("titleTags")} icon={Tag} />
          {coverageItems.length > 0 && (
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
          )}
          {tagGroups.length > 0 && (
            <SubBlock
              eyebrow={t("mostUsedTags")}
              spaced={coverageItems.length > 0}
            >
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

function Section({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      {children}
    </section>
  );
}

function recencyDetailItems(bands: number[], labels: string[]): DetailItem[] {
  return bands.map((count, i) => ({
    label: labels[i],
    count,
    colorClass: RECENCY_COLORS[i],
  }));
}

// Shared bar-popover body: a title, label-led rows with aligned count/share
// columns, and a closing Total row. Rendered inside SegmentedBar's dark Dialog.
function BreakdownDetail({
  title,
  items,
  totalLabel,
  nf,
}: {
  title: string;
  items: DetailItem[];
  totalLabel: string;
  nf: Intl.NumberFormat;
}) {
  const total = items.reduce((sum, it) => sum + it.count, 0);
  return (
    <div>
      <p className="mb-2 border-b border-white/15 pb-1.5 text-gray-400">{title}</p>
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3.5 gap-y-2">
        {items.map(({ label, count, colorClass, measure }) => (
        <Fragment key={label}>
          <span className="flex items-baseline gap-1.5 text-white">
            <span
              aria-hidden
              className={`size-1.5 flex-none self-center rounded-full ${colorClass}`}
            />
            {label}
            {measure && <span className="text-gray-400">{`(${measure})`}</span>}
          </span>
          <span className="text-right font-semibold tabular-nums text-white">
            {nf.format(count)}
          </span>
          <span className="min-w-[3ch] text-right tabular-nums text-gray-400">
            {formatPct(total > 0 ? (count / total) * 100 : 0)}
          </span>
        </Fragment>
        ))}
        <div className="col-span-3 border-t border-white/15" />
        <span className="pl-3 text-gray-400">{totalLabel}</span>
        <span className="text-right font-semibold tabular-nums text-white">
          {nf.format(total)}
        </span>
        <span className="min-w-[3ch] text-right tabular-nums text-gray-400">
          {formatPct(100)}
        </span>
      </div>
    </div>
  );
}

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
  // extra top space when stacked after another chart
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

function GeomLegend({ items }: { items: GeomItem[] }) {
  return (
    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
      {items.map(({ icon: Icon, textClass, label, display, noneLabel, count }) => (
        <span
          key={label}
          className={`inline-flex items-center gap-1.5${count === 0 ? " opacity-60" : ""}`}
        >
          <Icon
            className={`size-3.5 flex-none ${
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

function round1(n: number): number {
  return n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
}

// Numbers are locale-formatted; the SI symbols (m, km, m², km²) are appended as
// literals. Intl `style:"unit"` can't render m²/km² — square-meter and
// square-kilometer aren't ECMA-402-sanctioned unit identifiers (they throw).
function formatLength(km: number, nf: Intl.NumberFormat): string {
  if (km <= 0) return `0 m`;
  if (km < 1) return `${nf.format(Math.round(km * 1000))} m`;
  return `${nf.format(round1(km))} km`;
}

// m² up to 1 km², then km² (avoids "500M m²" at city scale). Hectares dropped —
// weak reader intuition; cf. iD, which keeps m² primary and shows ha only as a
// secondary hint.
function formatArea(
  km2: number,
  nf: Intl.NumberFormat,
  compactNf: Intl.NumberFormat
): string {
  if (km2 <= 0) return `0 m²`;
  if (km2 < 1) return `${compactNf.format(Math.round(km2 * 1_000_000))} m²`;
  return `${nf.format(round1(km2))} km²`;
}

function formatPct(pct: number): string {
  if (pct > 0 && pct < 1) return "<1%"; // avoid a misleading "0%" for a nonzero count
  if (pct > 0 && pct < 100 && Math.round(pct) === 100) {
    return `${pct.toFixed(1)}%`; // avoid a misleading "100%" short of full
  }
  return `${Math.round(pct)}%`;
}

function bandsIfPopulated(bands: number[] | undefined): number[] | null {
  if (!bands || bands.length !== RECENCY_BANDS.length) return null;
  return bands.some((c) => c > 0) ? bands : null;
}

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
