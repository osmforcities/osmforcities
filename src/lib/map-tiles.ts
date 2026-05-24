import type { StyleSpecification } from "maplibre-gl";

type TileProvider = "cartodb" | "osm";

interface TileProviderConfig {
  url: string;
  tileSize: number;
  attribution: string;
}

const TILE_PROVIDERS: Record<TileProvider, TileProviderConfig> = {
  cartodb: {
    url: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
    tileSize: 512,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileSize: 256,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

function getTileConfig(): TileProviderConfig {
  const provider = (process.env.NEXT_PUBLIC_MAP_TILE_PROVIDER as TileProvider) || "cartodb";
  const customUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;

  // Custom URL overrides provider selection
  if (customUrl) {
    const customTileSize = process.env.NEXT_PUBLIC_MAP_TILE_SIZE
      ? parseInt(process.env.NEXT_PUBLIC_MAP_TILE_SIZE, 10)
      : 256; // Default to standard OSM tile size
    return {
      url: customUrl,
      tileSize: customTileSize,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', // Safe default
    };
  }

  return TILE_PROVIDERS[provider] || TILE_PROVIDERS.cartodb;
}

const tileConfig = getTileConfig();

export const mapStyle = {
  version: 8,
  sources: {
    tiles: {
      type: "raster",
      tiles: [tileConfig.url],
      tileSize: tileConfig.tileSize,
      attribution: tileConfig.attribution,
    },
  },
  layers: [{ id: "tiles", type: "raster", source: "tiles" }],
} satisfies StyleSpecification;
