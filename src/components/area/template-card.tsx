"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPin, Pencil, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTemplateIcon } from "@/lib/category-icons";
import { formatCompactNumber, formatRelativeTime } from "@/lib/dataset-stats";
import type { AreaDataType } from "@/lib/area-templates";
import { cn } from "@/lib/utils";

type TemplateCardProps = {
  template: AreaDataType;
  areaId: string;
  /** Shown on search results, e.g. "Mobility · Cycling". */
  topicPath?: string;
  phoneLayout?: "tile" | "row";
};

export function TemplateCard({
  template,
  areaId,
  topicPath,
  phoneLayout = "tile",
}: TemplateCardProps) {
  const t = useTranslations("AreaPage");
  const locale = useLocale();
  const { status } = template;
  const showDescription =
    template.description && template.description !== template.name;

  return (
    <Link
      href={`/area/${areaId}/dataset/${template.id}`}
      className={cn(
        "group flex h-full gap-3 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 transition-colors hover:border-olive-300 hover:bg-olive-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500",
        phoneLayout === "row"
          ? "min-h-[60px] flex-row items-center sm:flex-col sm:items-start"
          : "flex-col"
      )}
    >
      <span className="flex shrink-0 self-start rounded-lg bg-olive-100 p-1.5 text-olive-600">
        {getTemplateIcon(template.id, template.categorySlug)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-semibold group-hover:text-olive-700">{template.name}</h3>
        {showDescription && (
          <span className="text-sm leading-snug text-gray-600">
            {template.description}
          </span>
        )}
        {status && (
          <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs font-medium text-olive-700">
            <span
              className="inline-flex items-center gap-1"
              aria-label={t("statFeatures", { count: String(status.dataCount) })}
            >
              <MapPin className="h-3 w-3" aria-hidden />
              {formatCompactNumber(status.dataCount)}
            </span>
            <span
              className="inline-flex items-center gap-1"
              aria-label={t("statContributors", {
                count: String(status.contributors),
              })}
            >
              <Users className="h-3 w-3" aria-hidden />
              {formatCompactNumber(status.contributors)}
            </span>
            {status.lastEditedAt && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={t("lastEditedAria")}
              >
                <Pencil className="h-3 w-3" aria-hidden />
                {formatRelativeTime(status.lastEditedAt, locale)}
              </span>
            )}
          </span>
        )}
        {topicPath && (
          <span className="mt-auto pt-1 text-xs text-gray-500">{topicPath}</span>
        )}
      </div>
    </Link>
  );
}
