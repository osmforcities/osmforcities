export type Area = {
  id: number;
  name: string;
  /** OSM name:* translations keyed by subtag (en, es, pt, ...), plus `default`. */
  names?: Record<string, string>;
  displayName: string;
  osmType: string;
  class: string;
  type: string;
  addresstype?: string;
  boundingBox: [number, number, number, number];
  bounds?: string;
  centerLat?: number;
  centerLon?: number;
  countryCode?: string;
  country?: string;
  state?: string;
};
