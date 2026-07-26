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

// Non-tag properties from osmtogeojson output. Mirrors feature-detail-panel.tsx.
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
  lowerLabel: string;
  display: string;
  // null for points, which have no separate measure
  measure: string | null;
  noneLabel: string;
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
  // For joining absent geometry types: "lines or areas".
  const listFormat = useMemo(
    () => new Intl.ListFormat(locale, { type: "disjunction" }),
    [locale]
  );

  // Derived from the geojson; null when none is shipped.
  const derived = useMemo(() => {
    const gj = dataset.geojson as { features?: Feature[] } | null;
    if (!gj || !Array.isArray(gj.features) || gj.features.length === 0) {
      return null;
    }
    const features = gj.features;
    const now = Date.now();

    // Query keys (e.g. "highway" from "highway=bus_stop") match ~100% of
    // features by definition, so exclude them from Most-used-tags.
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

    // Same helpers the server uses, matching stored values.
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

  // Groups tags sharing the same displayed %, capped at 5 lines.
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

  // Share of features carrying each of the template's curated tags; absent = 0%.
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
  // Persisted mix if present, else derived from geojson.
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
  // Two absent types collapse into one row ("No lines or areas") instead of
  // two near-duplicate lines.
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
        {geomPresent.map(
          ({ label, lowerLabel, count, pct, measure, colorClass }) => (
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

  // --- Freshness ------------------------------------------------------------
  // Priority: persisted bands -> geojson-derived -> legacy qualityMetrics.
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

  // --- Mappers --------------------------------------------------------------
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

function Section({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      {children}
    </section>
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

function formatLength(km: number, nf: Intl.NumberFormat): string {
  if (km <= 0) return `0 m`;
  if (km < 1) return `${nf.format(Math.round(km * 1000))} m`;
  return `${nf.format(round1(km))} km`;
}

function formatArea(km2: number, nf: Intl.NumberFormat): string {
  if (km2 <= 0) return `0 m²`;
  if (km2 < 0.01) return `${nf.format(Math.round(km2 * 1_000_000))} m²`;
  if (km2 < 1) return `${nf.format(round1(km2 * 100))} ha`;
  return `${nf.format(round1(km2))} km²`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
