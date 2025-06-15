export async function fetchOsmRelationData(relationId: number) {
  const query = `
    [out:json][timeout:25];
    rel(${relationId});
    out bb tags;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) return null;

  const data = await res.json();
  const rel = data.elements?.[0];

  if (!rel || rel.type !== "relation") return null;

  return {
    name: rel.tags?.name || `Relation ${relationId}`,
    countryCode: rel.tags?.["ISO3166-1"] || null,
    bounds: rel.bounds
      ? `${rel.bounds.minlat},${rel.bounds.minlon},${rel.bounds.maxlat},${rel.bounds.maxlon}`
      : null,
    geojson: rel,
  };
}
