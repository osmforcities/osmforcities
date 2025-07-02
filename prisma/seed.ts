import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    name: "Bicycle Parking",
    description: "All bicycle parking spots and facilities",
    overpassQuery: `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  node["amenity"="bicycle_parking"](area.searchArea);
  way["amenity"="bicycle_parking"](area.searchArea);
  relation["amenity"="bicycle_parking"](area.searchArea);
);
out geom;`,
    category: "transportation",
    tags: ["amenity=bicycle_parking"],
  },
  {
    name: "Bus Stops",
    description: "Public transport bus stops",
    overpassQuery: `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  node["highway"="bus_stop"](area.searchArea);
  node["public_transport"="stop_position"]["bus"="yes"](area.searchArea);
);
out geom;`,
    category: "transportation",
    tags: ["highway=bus_stop", "public_transport=stop_position"],
  },
  {
    name: "ATMs",
    description: "Automated Teller Machines",
    overpassQuery: `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  node["amenity"="atm"](area.searchArea);
  way["amenity"="atm"](area.searchArea);
);
out geom;`,
    category: "financial",
    tags: ["amenity=atm"],
  },
  {
    name: "Public Toilets",
    description: "Public restroom facilities",
    overpassQuery: `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  node["amenity"="toilets"](area.searchArea);
  way["amenity"="toilets"](area.searchArea);
);
out geom;`,
    category: "amenities",
    tags: ["amenity=toilets"],
  },
  {
    name: "Electric Vehicle Charging",
    description: "Electric vehicle charging stations (EVCS)",
    overpassQuery: `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  node["amenity"="charging_station"](area.searchArea);
  way["amenity"="charging_station"](area.searchArea);
);
out geom;`,
    category: "transportation",
    tags: ["amenity=charging_station"],
  },
  {
    name: "Hospitals",
    description: "Hospital facilities",
    overpassQuery: `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  node["amenity"="hospital"](area.searchArea);
  way["amenity"="hospital"](area.searchArea);
  relation["amenity"="hospital"](area.searchArea);
);
out geom;`,
    category: "healthcare",
    tags: ["amenity=hospital"],
  },
];

async function main() {
  console.log("Start seeding...");

  // Clear existing templates
  await prisma.template.deleteMany();

  for (const template of templates) {
    await prisma.template.create({
      data: template,
    });
  }

  console.log("Seeded templates:", templates.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
