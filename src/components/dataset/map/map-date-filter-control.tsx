import React from "react";
import { DateFilterControls } from "./date-filter-controls";
import type { DateFilter } from "@/types/geojson";

type MapDateFilterControlProps = {
  availableTimeframes: DateFilter[];
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
};

export const MapDateFilterControl = React.memo<MapDateFilterControlProps>(
  ({ availableTimeframes, dateFilter, onDateFilterChange }) => {
    return (
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10">
        <DateFilterControls
          availableTimeframes={availableTimeframes}
          dateFilter={dateFilter}
          onDateFilterChange={onDateFilterChange}
        />
      </div>
    );
  }
);

MapDateFilterControl.displayName = "MapDateFilterControl";
