import type { ReactNode } from "react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";

export type BarSegment = {
  pct: number;
  colorClass: string;
  label: string;
  value: string;
  // muted parenthetical rendered after value
  sub?: ReactNode;
};

type SegmentedBarProps = {
  segments: BarSegment[];
  variant?: "dots" | "terse";
  showLegend?: boolean;
  ariaLabel: string;
  className?: string;
  // Renders the whole bar as a Popover trigger instead of a static element,
  // showing this on press/tap/keyboard rather than per-slice hover.
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
      className="flex h-2.5 gap-px overflow-hidden rounded-full bg-olive-100 ring-gray-800 ring-offset-1 group-data-[focus-visible]:ring-2 group-aria-expanded:ring-2"
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
