import { notFound } from "next/navigation";

export function parseAreaIdOrNotFound(areaId: string): number {
  const osmRelationId = Number.parseInt(areaId, 10);
  if (Number.isNaN(osmRelationId)) notFound();
  return osmRelationId;
}
