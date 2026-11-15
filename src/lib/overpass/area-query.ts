export function fillAreaQuery(rawQuery: string, areaId: number): string {
  return rawQuery.replace(/\{OSM_RELATION_ID\}/g, areaId.toString());
}
