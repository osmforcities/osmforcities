import type { StyleSpecification } from "maplibre-gl";
import { DEFAULT_STYLE_KNOBS } from "@/components/dataset/map/layers/map-style";

type TileProvider = "cartodb" | "osm";

interface TileProviderConfig {
  urls: string[];
  tileSize: number;
  attribution: string;
}

// CARTO watermarks tiles without a key: https://carto.com/basemaps/apikey
// Free tier, meant to be public in the client bundle; env var overrides.
const cartoKey =
  process.env.NEXT_PUBLIC_MAP_TILE_KEY || "cb1_2fz8_1_48ddf98f071b6781a3b403a8";

const TILE_PROVIDERS: Record<TileProvider, TileProviderConfig> = {
  cartodb: {
    urls: ["a", "b", "c", "d"].map(
      (sub) =>
        `https://${sub}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png?key=${cartoKey}`
    ),
    tileSize: 512,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  osm: {
    urls: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
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
      ? (parseInt(process.env.NEXT_PUBLIC_MAP_TILE_SIZE, 10) || 256)
      : 256; // Default to standard OSM tile size
    return {
      urls: [customUrl],
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
      tiles: tileConfig.urls,
      tileSize: tileConfig.tileSize,
      attribution: tileConfig.attribution,
    },
  },
  layers: [
    { id: "tiles", type: "raster", source: "tiles" },
    // Translucent wash mutes the raster basemap so data layers stay the
    // most saturated thing on screen (ciclomapa-style figure/ground)
    {
      id: "basemap-mute",
      type: "background",
      paint: {
        "background-color": "#ffffff",
        "background-opacity": DEFAULT_STYLE_KNOBS.basemapWashOpacity,
      },
    },
  ],
} satisfies StyleSpecification;
