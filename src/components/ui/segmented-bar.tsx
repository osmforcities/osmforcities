import type { ReactNode } from "react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";

export type BarSegment = {
  /** Width of the segment as a percentage of the bar (0–100). */
  pct: number;
  /** Tailwind background class, e.g. "bg-olive-600". Used for the bar and the dot. */
  colorClass: string;
  /** Legend label, e.g. "Points" or "Last 90d". */
  label: string;
  /** Bold legend value, e.g. "18,307" or "7%". */
  value: string;
  /** Optional muted parenthetical after the value, e.g. "(12.4 km)". */
  sub?: ReactNode;
};

type SegmentedBarProps = {
  segments: BarSegment[];
  /** "dots" shows a color swatch per legend entry (categorical); "terse" omits
   *  swatches — the bar's left-to-right order already carries the mapping. */
  variant?: "dots" | "terse";
  /** When false, render only the bar (no legend) — used when several bars share
   *  a single external legend. Segment values still feed the aria-label. */
  showLegend?: boolean;
  ariaLabel: string;
  className?: string;
  /** Optional breakdown revealed on hover / focus / tap of the WHOLE bar. When
   *  set, the entire bar becomes a single tooltip trigger (one large target)
   *  rather than exposing each — potentially sliver-thin — slice individually. */
  detail?: ReactNode;
};

/**
 * A stacked proportion bar with a compact legend beneath it. One visual grammar
 * shared by the Overview (geometry), Activity, and Community sections of the
 * dataset panel. Segments keep a min width so a rare slice stays visible.
 *
 * When `detail` is provided the whole bar is a focusable tooltip trigger; the
 * hit area is padded vertically so the thin (10px) bar is still easy to hit,
 * and the tooltip shows the full breakdown at once. Bars without `detail`
 * render exactly as before (a static `img` with the values in its aria-label).
 */
export function SegmentedBar({
  segments,
  variant = "terse",
  showLegend = true,
  ariaLabel,
  className,
  detail,
}: SegmentedBarProps) {
  const visible = segments.filter((s) => s.pct > 0);
  const interactive = detail != null;
  // Fold the per-segment values into the aria-label so screen readers still get
  // the breakdown even when the visual legend is hidden.
  const fullLabel = `${ariaLabel}: ${visible
    .map((s) => `${s.label} ${s.value}`)
    .join(", ")}`;
  const bar = (
    <div
      role={interactive ? undefined : "img"}
      aria-label={interactive ? undefined : fullLabel}
      aria-hidden={interactive ? true : undefined}
      className="flex h-2.5 gap-px overflow-hidden rounded-full bg-olive-100 group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-gray-800 group-data-[focus-visible]:ring-offset-1"
    >
      {visible.map((s, i) => (
        <span
          key={i}
          className={`block h-full min-w-[5px] ${s.colorClass}`}
          style={{ width: `${s.pct}%` }}
        />
      ))}
    </div>
  );
  return (
    <div className={className}>
      {interactive ? (
        <TooltipTrigger delay={0}>
          {/* Padded, full-width button so the whole 10px bar is an easy target. */}
          <Button
            aria-label={fullLabel}
            className="group block w-full cursor-help py-1.5 outline-none"
          >
            {bar}
          </Button>
          <Tooltip
            offset={6}
            className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg outline-none"
          >
            {detail}
          </Tooltip>
        </TooltipTrigger>
      ) : (
        bar
      )}
      {!showLegend ? null : (
      <div
        className={`mt-2.5 flex flex-wrap text-xs ${
          variant === "dots"
            ? "gap-x-4 gap-y-1 text-gray-500"
            : "gap-x-3.5 gap-y-1 text-gray-400"
        }`}
      >
        {visible.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {variant === "dots" && (
              <span
                aria-hidden
                className={`size-2 flex-none rounded-sm ${s.colorClass}`}
              />
            )}
            {s.label}
            <b className="font-bold tabular-nums text-gray-900">{s.value}</b>
            {s.sub != null && (
              <span className="tabular-nums text-gray-400">{s.sub}</span>
            )}
          </span>
        ))}
      </div>
      )}
    </div>
  );
}
