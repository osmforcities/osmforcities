import { OverpassQueryChip } from "@/components/dataset/overpass-query-chip";
import { CategoryFacet } from "@/components/dataset/category-facet";
import { PendingTimestamps } from "@/components/dataset/dataset-timestamps";

export function TemplateDescription({
  description,
}: {
  description: string | null;
}) {
  if (!description) return null;
  return (
    <p
      className="mt-1 text-sm text-gray-600"
      data-testid="dataset-template-description"
    >
      {description}
    </p>
  );
}

export function TemplateSummary({
  description,
  query,
  category,
  areaName,
  categoryHref,
}: {
  description: string | null;
  query: string;
  category: { slug: string } | null;
  areaName: string;
  categoryHref: string;
}) {
  return (
    <>
      <TemplateDescription description={description} />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <CategoryFacet
          category={category}
          areaName={areaName}
          categoryHref={categoryHref}
        />
        <PendingTimestamps />
        <OverpassQueryChip query={query} />
      </div>
    </>
  );
}
