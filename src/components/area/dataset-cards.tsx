import type { AreaTemplate } from "@/lib/area-templates";
import { DatasetCard } from "./dataset-card";

type DatasetCardsProps = {
  templates: AreaTemplate[];
  areaId: string;
};

export function DatasetCards({ templates, areaId }: DatasetCardsProps) {
  return (
    <ul
      className="grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3"
      data-testid="dataset-cards"
    >
      {templates.map((template) => (
        <li key={template.id}>
          <DatasetCard template={template} areaId={areaId} />
        </li>
      ))}
    </ul>
  );
}
