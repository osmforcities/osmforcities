import type { ReactNode } from "react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";

export type BarSegment = {
  pct: number; // 0-100
  colorClass: string; // Tailwind bg class, e.g. "bg-olive-600"
  label: string; // e.g. "Points" or "Last 90d"
  value: string; // bold legend value, e.g. "18,307" or "7%"
  sub?: ReactNode; // muted parenthetical, e.g. "(12.4 km)"
};

type SegmentedBarProps = {
  segments: BarSegment[];
  variant?: "dots" | "terse"; // "dots" adds a color swatch per legend entry
  showLegend?: boolean; // false when several bars share one external legend
  ariaLabel: string;
  className?: string;
  // Breakdown revealed on press/tap/keyboard of the whole bar (Popover, same
  // pattern as the freshness pills) instead of per-slice hover targets.
  detail?: ReactNode;
};

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
        <DialogTrigger>
          {/* Padded, full-width button so the whole 10px bar is an easy target. */}
          <Button
            aria-label={fullLabel}
            className="group block w-full cursor-pointer py-1.5 outline-none"
          >
            {bar}
          </Button>
          <Popover offset={6} className="outline-none">
            <Dialog
              aria-label={ariaLabel}
              className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg outline-none"
            >
              {detail}
            </Dialog>
          </Popover>
        </DialogTrigger>
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
