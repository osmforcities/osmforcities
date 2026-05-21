export const mockOverpassResponse = {
  version: 0.6,
  generator: "Overpass API stub",
  osm3s: {
    copyright:
      "The data included in this document is from www.openstreetmap.org.",
    timestamp_osm_base: "2024-01-01T00:00:00Z",
  },
  elements: [
    {
      type: "relation",
      id: 54321,
      bounds: {
        minlat: -23.8,
        minlon: -46.8,
        maxlat: -23.3,
        maxlon: -46.1,
      },
      members: [],
      tags: {
        name: "São Paulo",
        "name:en": "São Paulo",
        "name:pt": "São Paulo",
        type: "boundary",
        boundary: "administrative",
        admin_level: "8",
        population: "12396372",
        "ISO3166-2": "BR-SP",
        wikidata: "Q174",
        wikipedia: "pt:São Paulo",
      },
    },
  ],
};
