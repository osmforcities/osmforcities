"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import {
  Layers,
  Users,
  UserCheck,
  LandPlot,
  MapPin,
  Clock,
  Circle,
  Spline,
  Hexagon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import area from "@turf/area";
import { formatCompactNumber } from "@/lib/dataset-stats";
import { StatTile } from "@/components/ui/stat-tile";

type DatasetStatsTableProps = {
  dataset: Dataset;
};

const DASH = "—";

export function DatasetStatsTable({ dataset }: DatasetStatsTableProps) {
  const t = useTranslations("DatasetPage");
  const locale = useLocale();
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  // Total land area — the boundary polygon. Stable and SSR-safe (@turf/area on a
  // polygon is deterministic across runtimes). Shown as its own stat for
  // geographic scale/context.
  const landAreaKm2 = useMemo(() => {
    const gj = dataset.area.geojson;
    if (!gj) return null;
    try {
      const m2 = area(gj as Parameters<typeof area>[0]);
      return m2 > 0 ? m2 / 1_000_000 : null;
    } catch {
      return null;
    }
  }, [dataset.area.geojson]);

  // Points/lines/areas breakdown of the dataset's own geometry. Derived from the
  // geojson feature types — deterministic, so SSR-safe. Null when there's no geojson.
  const geomBreakdown = useMemo(() => {
    const gj = dataset.geojson as { features?: unknown[] } | null;
    if (!gj || !Array.isArray(gj.features)) return null;
    let points = 0;
    let lines = 0;
    let areas = 0;
    for (const f of gj.features) {
      const type = (f as { geometry?: { type?: string } })?.geometry?.type;
      if (type === "Point" || type === "MultiPoint") points++;
      else if (type === "LineString" || type === "MultiLineString") lines++;
      else if (type === "Polygon" || type === "MultiPolygon") areas++;
    }
    return { points, lines, areas };
  }, [dataset.geojson]);

  // Density over the full administrative area — features per km² of the boundary.
  // Boundary-based (not a data-derived hull) so it's deterministic, SSR-safe, and
  // comparable across datasets/cities regardless of geometry type.
  const density = landAreaKm2 ? dataset.dataCount / landAreaKm2 : null;
  const activeMappers = dataset.stats?.recentActivity?.editors;
  const stalePct = dataset.stats?.qualityMetrics?.staleElementsPercentage;

  // Rows for the standalone composition card (one geometry type per line).
  const geomRows = geomBreakdown
    ? [
        { icon: Circle, label: t("geomPoints"), count: geomBreakdown.points },
        { icon: Spline, label: t("geomLines"), count: geomBreakdown.lines },
        { icon: Hexagon, label: t("geomAreas"), count: geomBreakdown.areas },
      ]
    : null;

  const tiles: {
    icon: LucideIcon;
    label: string;
    tip: string;
    value: ReactNode;
    sub?: ReactNode;
  }[] = [
    // Order groups the grid into rows: [Features | Land area] (size),
    // [Mappers | Mappers·90d] (people, kept adjacent), [Density | Stale] (quality).
    {
      icon: Layers,
      label: t("features"),
      tip: t("featuresTip"),
      value: formatCompactNumber(dataset.dataCount),
    },
    {
      icon: LandPlot,
      label: t("landArea"),
      tip: t("landAreaTip"),
      value:
        landAreaKm2 != null
          ? `${formatCompactNumber(Math.round(landAreaKm2))} km²`
          : DASH,
    },
    {
      icon: Users,
      label: t("editors"),
      tip: t("editorsTip"),
      value: formatCompactNumber(dataset.stats?.editorsCount || 0),
      sub: t("editorsWindow"),
    },
    {
      icon: UserCheck,
      label: t("activeMappers"),
      tip: t("activeMappersTip"),
      value: activeMappers != null ? formatCompactNumber(activeMappers) : DASH,
      sub: t("activeMappersWindow"),
    },
    {
      icon: MapPin,
      label: t("density"),
      tip: t("densityTip"),
      value:
        density != null
          ? `${nf.format(
              density >= 10 ? Math.round(density) : Math.round(density * 10) / 10
            )} /km²`
          : DASH,
      sub: t("densityScope"),
    },
    {
      icon: Clock,
      label: t("stale"),
      tip: t("staleTip"),
      value: stalePct != null ? `${Math.round(stalePct)}%` : DASH,
    },
  ];

  return (
    // Card height flexes between a min (≈ content + half a line) and a max (7rem):
    // rows shrink to delay scrolling, grow to fill, and stop at the max on tall
    // displays. The grid fills its (scrollable) section and `align-content: safe
    // center` centers the card block when there's room but falls back to top-
    // alignment when it overflows — so a short section scrolls from the first card
    // instead of clipping it. `min-h-0` lets the flex-1 grid shrink to its rows' min.
    <dl className="grid flex-1 min-h-0 auto-rows-[minmax(4rem,7rem)] grid-cols-2 gap-2 [align-content:safe_center]">
      {tiles.map(({ icon, label, tip, value, sub }, i) => (
        <StatTile
          key={i}
          icon={icon}
          label={label}
          value={value}
          sub={sub}
          tip={tip}
        />
      ))}
      {geomRows && (
        <div className="col-span-2 flex flex-col justify-center gap-1.5 rounded-lg border border-olive-100 bg-olive-50 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
            {t("composition")}
          </div>
          {geomRows.map(({ icon: Icon, label, count }) => (
            <div
              key={label}
              className="flex items-center justify-between text-xs text-gray-700"
            >
              <span className="flex items-center gap-1.5">
                <Icon className="size-3.5 flex-shrink-0 text-olive-600" aria-hidden />
                {label}
              </span>
              <span className="font-bold text-gray-900">
                {formatCompactNumber(count)}
              </span>
            </div>
          ))}
        </div>
      )}
    </dl>
  );
}
