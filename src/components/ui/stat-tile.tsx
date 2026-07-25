import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** Optional muted subline shown between the value and the label (breakdown,
   *  time window, etc.). A fixed-height slot is reserved on every tile so the
   *  three rows line up across the grid whether or not `sub` is set. */
  sub?: ReactNode;
  tip?: string;
};

// Compact stat facet used in the dataset side-panel grid. Lives in the grid's <dl>,
// so it renders <dd>/<dt> directly. Three stacked rows — value, label, fine line
// (fine line last) — centered within a cell-filling box (h-full) so content sits in
// the vertical middle of the card rather than at the top. The value scales fluidly
// with viewport height (a proxy for card height here) and the trailing icon tracks
// it via em units.
export function StatTile({ icon: Icon, label, value, sub, tip }: StatTileProps) {
  return (
    <div
      title={tip}
      className="flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-olive-100 bg-olive-50 px-2.5 py-2 text-center"
    >
      <dd className="flex items-center justify-center gap-1.5 text-[clamp(1.125rem,1.7vh,1.5rem)] font-bold leading-none text-gray-900">
        {value}
        <Icon className="size-[1.15em] flex-shrink-0 text-olive-600" aria-hidden />
      </dd>
      <dt className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
        {label}
      </dt>
      {/* fixed-height fine line (last) — identical on every tile (empty or not) so
          the three rows line up across the whole grid */}
      <div className="flex h-4 items-center justify-center text-[10px] leading-tight text-gray-400">
        {sub}
      </div>
    </div>
  );
}
