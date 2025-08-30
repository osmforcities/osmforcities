import { useTranslations } from "next-intl";
import type { DateFilter } from "@/types/geojson";

type NoDataMessageProps = {
  hasData: boolean;
  dateFilter: DateFilter;
  noDataMessage?: string;
};

export function NoDataMessage({
  hasData,
  dateFilter,
  noDataMessage,
}: NoDataMessageProps) {
  const t = useTranslations("DatasetMap");

  if (hasData) return null;

  return (
    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
      <p className="text-muted-foreground">
        {noDataMessage ||
          (dateFilter === "all"
            ? t("noGeographicData")
            : t("noDataInTimeframe"))}
      </p>
    </div>
  );
}
