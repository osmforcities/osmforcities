import { useTranslations } from "next-intl";

export function DatasetActionsSection() {
  const t = useTranslations("DatasetExplorer");
  
  return (
    <div className="pb-8">
      <div className="border-t border-gray-200 my-4"></div>
      <div className="mt-4 flex justify-center">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {t("downloadData")}
        </button>
      </div>
    </div>
  );
}
