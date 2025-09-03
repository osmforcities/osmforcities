import React, { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ToggleButton, Group } from "react-aria-components";
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

    // Hide when only one option available
    if (filteredOptions.length <= 1) {
      return null;
    }

    return (
      <Group 
        aria-label={t("showData")}
        className="inline-flex bg-background/95 backdrop-blur-sm border rounded-lg p-1 shadow-sm"
      >
        {filteredOptions.map((option) => (
          <ToggleButton
            key={option.value}
            isSelected={dateFilter === option.value}
            onChange={(isSelected) => {
              if (isSelected) {
                handleFilterChange(option.value);
              }
            }}
            className={({ isSelected, isHovered, isFocused, isPressed }) => `
              px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-md transition-all duration-200
              sm:px-4 sm:py-2 sm:text-sm
              ${isFocused ? 'outline-none ring-2 ring-primary ring-offset-1' : ''}
              ${isSelected 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : `text-muted-foreground ${isHovered ? 'text-foreground bg-muted/50' : ''} ${isPressed ? 'bg-muted' : ''}`
              }
            `}
          >
            {t(option.labelKey)}
          </ToggleButton>
        ))}
      </Group>
    );
  }
);

DateFilterControls.displayName = "DateFilterControls";
