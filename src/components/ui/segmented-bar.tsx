import type { ReactNode } from "react";

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
  ariaLabel: string;
  className?: string;
};

/**
 * A stacked proportion bar with a compact legend beneath it. One visual grammar
 * shared by the Overview (geometry), Activity, and Community sections of the
 * dataset panel. Segments keep a min width so a rare slice stays visible.
 */
export function SegmentedBar({
  segments,
  variant = "terse",
  ariaLabel,
  className,
}: SegmentedBarProps) {
  const visible = segments.filter((s) => s.pct > 0);
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-2.5 gap-px overflow-hidden rounded-full bg-olive-100"
      >
        {visible.map((s, i) => (
          <span
            key={i}
            className={`block h-full min-w-[5px] ${s.colorClass}`}
            style={{ width: `${s.pct}%` }}
          />
        ))}
      </div>
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
    </div>
  );
}
