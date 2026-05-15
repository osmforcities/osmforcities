import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center flex-1">
        <div className="w-full max-w-md">
          <Link
            href={`/area/${areaId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            {t("back")}
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
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

            <Link href="/enter" className="w-full">
              <Button variant="primary" size="lg" className="w-full">
                {t("continueWithEmail")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
