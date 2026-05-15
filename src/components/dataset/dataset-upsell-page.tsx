import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { InfoCard } from "@/components/ui/info-card";

interface DatasetUpsellPageProps {
  datasetName: string;
  areaName: string;
  areaId: string;
}

export function DatasetUpsellPage({
  datasetName,
  areaName,
  areaId,
}: DatasetUpsellPageProps) {
  const t = useTranslations("DatasetUpsell");

  return (
    <PageShell placement="top">
      <div className="w-full max-w-md mx-auto">
        <Link
          href={`/area/${areaId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          {t("back")}
        </Link>

        <InfoCard>
          <h1 className="text-xl font-medium text-gray-900 mb-4">
            {t("accountRequired")}
          </h1>

          <p className="text-gray-600 mb-8">
            {t.rich("signInToBrowse", {
              strong: (chunks) => (
                <strong className="text-gray-900">{chunks}</strong>
              ),
              dataset: datasetName,
              area: areaName,
            })}
          </p>

          <Link
            href={`/enter?callbackUrl=/area/${areaId}/dataset/${encodeURIComponent(datasetName)}`}
            className="w-full"
          >
            <Button variant="primary" size="lg" className="w-full">
              {t("continueWithEmail")}
            </Button>
          </Link>
        </InfoCard>
      </div>
    </PageShell>
  );
}
