"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { Dataset } from "@/schemas/dataset";
import { Link } from "@/i18n/navigation";

type TemplateHierarchyLinksProps = {
  dataset: Dataset;
};

const linkClasses =
  "text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 hover:decoration-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500";

const datasetHref = (areaId: number, templateId: string) =>
  `/area/${areaId}/dataset/${templateId}`;

export function ParentTemplateLink({ dataset }: TemplateHierarchyLinksProps) {
  const t = useTranslations("DatasetPage");
  const parent = dataset.template.parent;
  if (!parent) return null;

  return (
    <p className="mt-1 text-sm text-gray-500">
      {t.rich("partOf", {
        template: parent.name,
        link: (chunks) => (
          <Link href={datasetHref(dataset.area.id, parent.id)} className={linkClasses}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}

export function ChildTemplateLinks({ dataset }: TemplateHierarchyLinksProps) {
  const t = useTranslations("DatasetPage");
  const headingId = useId();
  const children = dataset.template.children ?? [];
  if (children.length === 0) return null;

  return (
    <nav
      aria-labelledby={headingId}
      className="mt-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <h3
        id={headingId}
        className="text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400"
      >
        {t("moreSpecific")}
      </h3>
      <ul className="flex flex-col gap-1.5 text-sm">
        {children.map((child) => (
          <li key={child.id}>
            <Link href={datasetHref(dataset.area.id, child.id)} className={linkClasses}>
              {child.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
