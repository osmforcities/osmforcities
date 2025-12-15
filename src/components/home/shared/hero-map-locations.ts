export type HeroLocation = {
  id: string;
  longitude: number;
  latitude: number;
  zoom: number;
};

export const HERO_LOCATIONS: HeroLocation[] = [
  // Europe
  {
    id: "london-uk",
    longitude: -0.1277653,
    latitude: 51.5074456,
    zoom: 11,
  },
  {
    id: "paris-fr",
    longitude: 2.3483915,
    latitude: 48.8534951,
    zoom: 11,
  },
  {
    id: "berlin-de",
    longitude: 13.3888222,
    latitude: 52.517012,
    zoom: 11,
  },
  {
    id: "rome-it",
    longitude: 12.4829321,
    latitude: 41.8933203,
    zoom: 11,
  },
  {
    id: "madrid-es",
    longitude: -3.703507,
    latitude: 40.416782,
    zoom: 11,
  },
  {
    id: "amsterdam-nl",
    longitude: 4.8924534,
    latitude: 52.3730796,
    zoom: 11,
  },
  {
    id: "lisbon-pt",
    longitude: -9.1365919,
    latitude: 38.7077507,
    zoom: 11,
  },

  // Americas
  {
    id: "washington-d-c-us",
    longitude: -77.0365427,
    latitude: 38.8950368,
    zoom: 11,
  },
  {
    id: "mexico-city-mx",
    longitude: -99.1331785,
    latitude: 19.4326296,
    zoom: 11,
  },
  {
    id: "s-o-paulo-br",
    longitude: -46.6333824,
    latitude: -23.5506507,
    zoom: 11,
  },
  {
    id: "buenos-aires-ar",
    longitude: -58.3887904,
    latitude: -34.6095579,
    zoom: 11,
  },
  {
    id: "bogot-co",
    longitude: -74.0836331,
    latitude: 4.6533817,
    zoom: 11,
  },
  {
    id: "ottawa-ca",
    longitude: -75.6901106,
    latitude: 45.4208777,
    zoom: 11,
  },

  // Asia
  {
    id: "tokyo-jp",
    longitude: 139.7638947,
    latitude: 35.6768601,
    zoom: 11,
  },
  {
    id: "new-delhi-in",
    longitude: 77.2090057,
    latitude: 28.6138954,
    zoom: 11,
  },
  {
    id: "bangkok-th",
    longitude: 100.4935089,
    latitude: 13.7524938,
    zoom: 11,
  },
  {
    id: "jakarta-id",
    longitude: 106.827168,
    latitude: -6.1754049,
    zoom: 11,
  },
  {
    id: "seoul-kr",
    longitude: 126.9782914,
    latitude: 37.5666791,
    zoom: 11,
  },
  {
    id: "singapore-sg",
    longitude: 103.8519072,
    latitude: 1.2899175,
    zoom: 11,
  },

  // Africa
  {
    id: "cairo-eg",
    longitude: 31.2357257,
    latitude: 30.0443879,
    zoom: 11,
  },
  {
    id: "nairobi-ke",
    longitude: 36.8172812,
    latitude: -1.2890006,
    zoom: 11,
  },
  {
    id: "accra-gh",
    longitude: -0.2012376,
    latitude: 5.5571096,
    zoom: 11,
  },
  {
    id: "dakar-sn",
    longitude: -17.447938,
    latitude: 14.693425,
    zoom: 11,
  },

  // Oceania
  {
    id: "sydney-au",
    longitude: 151.2082848,
    latitude: -33.8698439,
    zoom: 11,
  },
  {
    id: "wellington-nz",
    longitude: 174.7772114,
    latitude: -41.2887953,
    zoom: 11,
  },
];
