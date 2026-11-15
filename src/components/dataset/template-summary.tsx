import { OverpassQueryChip } from "@/components/dataset/overpass-query-chip";

export function TemplateSummary({
  description,
  query,
}: {
  description: string | null;
  query: string;
}) {
  return (
    <>
      {description && (
        <p
          className="mt-1 text-sm text-gray-600"
          data-testid="dataset-template-description"
        >
          {description}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <OverpassQueryChip query={query} />
      </div>
    </>
  );
}
