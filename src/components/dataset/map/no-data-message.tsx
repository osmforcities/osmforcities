import { useTranslations } from "next-intl";

type NoDataMessageProps = {
  hasData: boolean;
  noDataMessage?: string;
};

export function NoDataMessage({ hasData, noDataMessage }: NoDataMessageProps) {
  const t = useTranslations("DatasetMap");

  if (hasData) return null;

  return (
    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
      <p className="text-muted-foreground">
        {noDataMessage || t("noGeographicData")}
      </p>
    </div>
  );
}
