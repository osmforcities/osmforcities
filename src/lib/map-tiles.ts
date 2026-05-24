const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png";

export const mapStyle = {
  version: 8,
  sources: {
    tiles: {
      type: "raster",
      tiles: [TILE_URL],
      tileSize: 512,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: "tiles", type: "raster", source: "tiles" }],
} satisfies import("maplibre-gl").StyleSpecification;
