import React from "react";
import { useTranslations } from "next-intl";
import type { DateFilter } from "@/types/geojson";
import { NoDataMessage } from "./no-data-message";

type MapErrorStateProps = {
  dateFilter: DateFilter;
};

export const MapErrorState = React.memo<MapErrorStateProps>(
  () => {
    const t = useTranslations("DatasetPage");

    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("invalidData")}
          </h3>
          <p className="text-gray-600">
            {t("invalidDataMessage")}
          </p>
        </div>
      </div>
    );
  }
);

MapErrorState.displayName = "MapErrorState";

type MapNoDataStateProps = {
  dateFilter: DateFilter;
  hasData: boolean;
};

export const MapNoDataState = React.memo<MapNoDataStateProps>(
  ({ dateFilter, hasData }) => {
    const t = useTranslations("DatasetMap");

    return (
      <div className="h-full flex items-center justify-center">
        <NoDataMessage
          hasData={hasData}
          dateFilter={dateFilter}
          noDataMessage={t("noDataAvailable")}
        />
      </div>
    );
  }
);

MapNoDataState.displayName = "MapNoDataState";
