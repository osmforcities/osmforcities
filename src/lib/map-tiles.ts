import type { StyleSpecification, LayerSpecification } from "maplibre-gl";
import positron from "./basemap/positron.json";
import { DEFAULT_STYLE_KNOBS } from "@/components/dataset/map/layers/map-style";

const positronStyle = positron as unknown as StyleSpecification;

const firstLabelIndex = positronStyle.layers.findIndex(
  (l) => l.type === "symbol"
);

/** Dataset layers mount with this `beforeId` so basemap labels draw above the data. */
export const BASEMAP_LABELS_ANCHOR = positronStyle.layers[firstLabelIndex].id;

export const BASEMAP_WASH_LAYER_ID = "basemap-wash";

const wash: LayerSpecification = {
  id: BASEMAP_WASH_LAYER_ID,
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
