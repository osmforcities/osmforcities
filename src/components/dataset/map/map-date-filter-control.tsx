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
        <div className="bg-background/90 backdrop-blur-sm rounded-lg border shadow-lg p-3 min-w-[500px]">
          <DateFilterControls
            availableTimeframes={availableTimeframes}
            dateFilter={dateFilter}
            onDateFilterChange={onDateFilterChange}
          />
        </div>
      </div>
    );
  }
);

MapDateFilterControl.displayName = "MapDateFilterControl";
