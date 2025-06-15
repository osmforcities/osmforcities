export type Area = {
  id: number;
  name: string;
  displayName: string;
  osmType: string;
  boundingBox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  countryCode?: string;
};
