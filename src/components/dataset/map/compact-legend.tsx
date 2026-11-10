import type { LegendCategory } from "@/lib/curated-themes";

export function CompactLegend({
  title,
  rows,
}: {
  title: string;
  rows: Pick<LegendCategory, "id" | "label" | "color">[];
}) {
  return (
    <div className="bg-white/90 border rounded-lg px-2.5 py-1.5 shadow-sm">
      <span className="block text-xs font-medium text-gray-900 mb-1">
        {title}
      </span>
      <div className="space-y-0.5">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm border"
              style={{ backgroundColor: row.color }}
            />
            <span className="text-gray-700">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
