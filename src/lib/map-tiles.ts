import type { StyleSpecification, LayerSpecification } from "maplibre-gl";
import positron from "./basemap/positron.json";
import { DEFAULT_STYLE_KNOBS } from "@/components/dataset/map/layers/map-style";

// Attribution comes from the source TileJSON: keep the attribution control.
const positronStyle = positron as unknown as StyleSpecification;

const firstLabelIndex = positronStyle.layers.findIndex(
  (l) => l.type === "symbol"
);

/** Dataset layers mount with this `beforeId` so basemap labels draw above the data. */
export const BASEMAP_LABELS_ANCHOR = positronStyle.layers[firstLabelIndex].id;

// Mutes the ground so data layers stay the most saturated thing on screen.
const wash: LayerSpecification = {
  id: "basemap-mute",
  type: "background",
  paint: {
    "background-color": "#ffffff",
    "background-opacity": DEFAULT_STYLE_KNOBS.basemapWashOpacity,
  },
};

export const mapStyle: StyleSpecification = {
  ...positronStyle,
  layers: [
    ...positronStyle.layers.slice(0, firstLabelIndex),
    wash,
    ...positronStyle.layers.slice(firstLabelIndex),
  ],
};
