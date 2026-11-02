"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getTemplateIcon } from "@/lib/category-icons";
import { formatCompactNumber } from "@/lib/dataset-stats";
import type { AreaDataType } from "@/lib/area-templates";

type TemplateItemProps = {
  template: AreaDataType;
  areaId: string;
};

export function TemplateItem({ template, areaId }: TemplateItemProps) {
  const t = useTranslations("AreaPage");
  const { status } = template;

  return (
    <Link
      href={`/area/${areaId}/dataset/${template.id}`}
      title={template.description ?? undefined}
      className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 transition-colors hover:border-olive-300 hover:bg-olive-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500"
    >
      <span className="flex shrink-0 text-olive-600 [&_svg]:h-4 [&_svg]:w-4">
        {getTemplateIcon(template.id, template.categorySlug)}
      </span>
      <span className="min-w-0 flex-1 truncate">{template.name}</span>
      {status && (
        <span
          className="shrink-0 text-xs text-olive-700"
          aria-label={t("statFeatures", { count: String(status.dataCount) })}
        >
          {formatCompactNumber(status.dataCount)}
        </span>
      )}
    </Link>
  );
}
