import { OverpassQueryChip } from "@/components/dataset/overpass-query-chip";

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
}: {
  description: string | null;
  query: string;
}) {
  return (
    <>
      <TemplateDescription description={description} />
      <div className="mt-2">
        <OverpassQueryChip query={query} />
      </div>
    </>
  );
}
