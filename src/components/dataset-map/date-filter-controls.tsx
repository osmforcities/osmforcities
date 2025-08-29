import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { DateFilter } from "@/types/geojson";
import { DATE_FILTER_OPTIONS } from "@/types/geojson";

type DateFilterControlsProps = {
  availableTimeframes: DateFilter[];
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
};

export function DateFilterControls({
  availableTimeframes,
  dateFilter,
  onDateFilterChange,
}: DateFilterControlsProps) {
  const t = useTranslations("DatasetMap");

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm font-medium text-muted-foreground self-center">
        {t("showData")}
        {t("colon")}
      </span>
      {DATE_FILTER_OPTIONS.filter((option) =>
        availableTimeframes.includes(option.value)
      ).map((option) => (
        <Button
          key={option.value}
          variant={dateFilter === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onDateFilterChange(option.value)}
        >
          {t(option.labelKey)}
        </Button>
      ))}
    </div>
  );
}
