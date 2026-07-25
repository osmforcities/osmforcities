"use client";

import { useState, useEffect, useMemo } from "react";
import type { Dataset } from "@/schemas/dataset";
import { useTranslations, useLocale } from "next-intl";
import { Layers, Users, Frame, LayoutGrid, Activity, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import area from "@turf/area";
import bbox from "@turf/bbox";
import convex from "@turf/convex";

type DatasetStatsTableProps = {
  dataset: Dataset;
};

const DASH = "—";

export function DatasetStatsTable({ dataset }: DatasetStatsTableProps) {
  const t = useTranslations("DatasetPage");
  const locale = useLocale();
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  // Total city area — the municipality boundary polygon. Stable and SSR-safe
  // (@turf/area on a polygon is deterministic across runtimes). Shown as its own
  // stat for geographic scale/context.
  const cityAreaKm2 = useMemo(() => {
    const gj = dataset.area.geojson;
    if (!gj) return null;
    try {
      const m2 = area(gj as Parameters<typeof area>[0]);
      return m2 > 0 ? m2 / 1_000_000 : null;
    } catch {
      return null;
    }
  }, [dataset.area.geojson]);

  // Area actually covered by the data = convex hull of the features. Used ONLY as
  // the density denominator (not shown), so density reflects how packed the data
  // is within its own extent rather than being diluted by empty administrative
  // land. Computed CLIENT-SIDE ONLY: @turf/convex diverges between Node (SSR) and
  // the browser on large geometries (SSR → null → bbox fallback while the browser
  // builds the hull), which caused hydration mismatches. Deferring to after mount
  // keeps SSR and the first client paint identical. Falls back to the bounding box
  // when a hull can't be built (< 3 points / collinear features).
  const [coveredKm2, setCoveredKm2] = useState<number | null>(null);

  useEffect(() => {
    const gj = dataset.geojson;

    let poly: unknown = null;
    if (gj) {
      try {
        poly = convex(gj as Parameters<typeof convex>[0]);
      } catch {
        poly = null;
      }
    }

    if (!poly) {
      const bb =
        dataset.bbox ??
        (gj ? (bbox(gj as Parameters<typeof bbox>[0]) as number[]) : null);
      if (bb && bb.length >= 4) {
        const [minX, minY, maxX, maxY] = bb;
        poly = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [minX, minY],
                [maxX, minY],
                [maxX, maxY],
                [minX, maxY],
                [minX, minY],
              ],
            ],
          },
        };
      }
    }

    if (!poly) {
      setCoveredKm2(null);
      return;
    }
    try {
      const m2 = area(poly as Parameters<typeof area>[0]);
      setCoveredKm2(m2 > 0 ? m2 / 1_000_000 : null);
    } catch {
      setCoveredKm2(null);
    }
  }, [dataset.geojson, dataset.bbox]);

  const density = coveredKm2 ? dataset.dataCount / coveredKm2 : null;
  const recentEdits = dataset.stats?.recentActivity?.elementsEdited;
  const freshness =
    dataset.stats?.qualityMetrics?.recentlyUpdatedElementsPercentage;

  const tiles: {
    icon: LucideIcon;
    label: string;
    tip: string;
    value: string;
  }[] = [
    {
      icon: Layers,
      label: t("features"),
      tip: t("featuresTip"),
      value: nf.format(dataset.dataCount),
    },
    {
      icon: Users,
      label: t("editors"),
      tip: t("editorsTip"),
      value: nf.format(dataset.stats?.editorsCount || 0),
    },
    {
      icon: Frame,
      label: t("cityArea"),
      tip: t("cityAreaTip"),
      value:
        cityAreaKm2 != null ? `${nf.format(Math.round(cityAreaKm2))} km²` : DASH,
    },
    {
      icon: LayoutGrid,
      label: t("density"),
      tip: t("densityTip"),
      value:
        density != null
          ? `${nf.format(
              density >= 10 ? Math.round(density) : Math.round(density * 10) / 10
            )} /km²`
          : DASH,
    },
    {
      icon: Activity,
      label: t("recentEdits"),
      tip: t("recentEditsTip"),
      value: recentEdits != null ? nf.format(recentEdits) : DASH,
    },
    {
      icon: CalendarClock,
      label: t("recentlyUpdated"),
      tip: t("recentlyUpdatedTip"),
      value: freshness != null ? `${Math.round(freshness)}%` : DASH,
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
      {tiles.map(({ icon: Icon, label, tip, value }) => (
        <div
          key={label}
          title={tip}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-olive-100 bg-olive-50 px-2.5 py-2 text-center"
        >
          {/* icon trails the value/number; value scales fluidly with viewport
              height (a proxy for card height in this layout) and the icon tracks
              it via em units */}
          <dd className="flex items-center justify-center gap-1.5 text-[clamp(1.125rem,1.7vh,1.5rem)] font-bold leading-none text-gray-900">
            {value}
            <Icon
              className="size-[1.15em] flex-shrink-0 text-olive-600"
              aria-hidden
            />
          </dd>
          <dt className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
            {label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
