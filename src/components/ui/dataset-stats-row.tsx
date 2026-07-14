import { MapPin, Users, Pencil, Bookmark } from "lucide-react";
import { formatCompactNumber } from "@/lib/dataset-stats";
import { cn } from "@/lib/utils";

export type StatType = "features" | "contributors" | "lastEdited" | "savedBy";

export type DatasetStat = {
  type: StatType;
  label: string;
  value: string | number;
};

function getStatIcon(type: StatType) {
  if (type === "contributors") return Users;
  if (type === "lastEdited") return Pencil;
  if (type === "savedBy") return Bookmark;
  return MapPin;
}

function formatStatValue(type: StatType, value: string | number): string {
  if (type === "lastEdited") return String(value);
  return formatCompactNumber(value);
}

export function DatasetStatsRow({
  stats,
  className,
}: {
  stats: DatasetStat[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 text-[10px]", className)}>
      {stats.map((stat) => {
        const StatIcon = getStatIcon(stat.type);
        return (
          <div
            key={stat.type}
            aria-label={stat.label}
            className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400"
          >
            <StatIcon className="w-2.5 h-2.5" />
            <span className="font-medium">
              {formatStatValue(stat.type, stat.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
