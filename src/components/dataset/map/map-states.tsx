import { useTranslations } from "next-intl";

export function MapNoDataState() {
  const t = useTranslations("DatasetMap");

  return (
    <div className="h-full flex items-center justify-center">
      <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <p className="text-muted-foreground">{t("noDataAvailable")}</p>
      </div>
    </div>
  );
}
