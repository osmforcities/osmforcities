import { Link } from "@/i18n/navigation";
import { getTemplateIcon } from "@/lib/category-icons";
import type { AreaTemplate } from "@/lib/area-templates";

const datasetGridClassName =
  "grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3";

type DatasetCardsProps = {
  templates: AreaTemplate[];
  areaId: string;
};

export function DatasetCards({ templates, areaId }: DatasetCardsProps) {
  return (
    <ul className={datasetGridClassName} data-testid="dataset-cards">
      {templates.map((template) => (
        <li key={template.id}>
          <DatasetCard template={template} areaId={areaId} />
        </li>
      ))}
    </ul>
  );
}

export function DatasetCardsSkeleton() {
  return (
    <ul aria-busy className={datasetGridClassName}>
      {Array.from({ length: 6 }, (_, index) => (
        <li
          key={index}
          className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </ul>
  );
}

function DatasetCard({ template, areaId }: { template: AreaTemplate; areaId: string }) {
  const showDescription = template.description && template.description !== template.name;

  return (
    <Link
      href={`/area/${areaId}/dataset/${template.id}`}
      className="group flex h-full gap-3 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 transition-colors hover:border-olive-300 hover:bg-olive-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-olive-100 text-olive-600 [&_svg]:h-6 [&_svg]:w-6">
        {getTemplateIcon(template.id, template.categorySlug)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="font-semibold group-hover:text-olive-700">{template.name}</h3>
        {showDescription && (
          <span className="line-clamp-2 text-sm leading-snug text-gray-600">
            {template.description}
          </span>
        )}
      </div>
    </Link>
  );
}
