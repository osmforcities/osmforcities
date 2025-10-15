import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export default async function PublicDatasetsFeed() {
  const t = await getTranslations("PublicDatasetsFeed");

  const datasets = await prisma.dataset.findMany({
    where: { isPublic: true },
    include: {
      template: true,
      user: true,
      area: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (datasets.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="border border-black p-4 text-center">
          <p className="text-gray-600">{t("noDatasetsYet")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="border border-black">
        <div className="border-b border-black p-4 bg-gray-50">
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-gray-600 mt-1">{t("subtitle")}</p>
        </div>

        <div className="divide-y divide-gray-200">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">
                    {dataset.template.name} {t("in")} {dataset.cityName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {dataset.template.description}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                  {dataset.template.category}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex space-x-4">
                  <span>
                    {t("dataCount", {
                      count: dataset.dataCount,
                    })}
                  </span>
                  <span>
                    {t("lastChecked", {
                      date: dataset.lastChecked
                        ? new Date(dataset.lastChecked).toLocaleDateString()
                        : t("never"),
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs">
                      {new Date(dataset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/dataset/${dataset.id}`}>
                      {t("viewDataset")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
