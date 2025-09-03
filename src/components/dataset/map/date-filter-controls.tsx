import React, { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { DateFilter } from "@/types/geojson";
import { DATE_FILTER_OPTIONS } from "@/types/geojson";

type DateFilterControlsProps = {
  availableTimeframes: DateFilter[];
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
};

export const DateFilterControls = React.memo<DateFilterControlsProps>(
  ({ availableTimeframes, dateFilter, onDateFilterChange }) => {
    const t = useTranslations("DatasetMap");

    // Memoize filtered options to avoid recalculation
    const filteredOptions = useMemo(
      () =>
        DATE_FILTER_OPTIONS.filter((option) =>
          availableTimeframes.includes(option.value)
        ),
      [availableTimeframes]
    );

    // Memoize click handler
    const handleFilterChange = useCallback(
      (filter: DateFilter) => {
        onDateFilterChange(filter);
      },
      [onDateFilterChange]
    );

    return (
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          {t("showData")}
          {t("colon")}
        </span>
        <div className="flex gap-2">
          {filteredOptions.map((option) => (
            <Button
              key={option.value}
              variant={dateFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(option.value)}
              className="transition-all duration-200 hover:scale-105 whitespace-nowrap"
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </div>
      </div>
    );
  }
);

DateFilterControls.displayName = "DateFilterControls";
