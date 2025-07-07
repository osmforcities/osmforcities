import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to create area-wrapped Overpass queries
function createAreaQuery(queries: string[]): string {
  const areaWrapper = `[out:json][timeout:25];
rel({OSM_RELATION_ID});
map_to_area -> .searchArea;
(
  ${queries.join("\n  ")}
);
out geom meta;`;

  return areaWrapper;
}

const templates = [
  {
    id: "bicycle-parking",
    name: "Bicycle Parking",
    description: "All bicycle parking spots and facilities",
    overpassQuery: createAreaQuery([
      'node["amenity"="bicycle_parking"](area.searchArea);',
      'way["amenity"="bicycle_parking"](area.searchArea);',
      'relation["amenity"="bicycle_parking"](area.searchArea);',
    ]),
    category: "transportation",
    tags: ["amenity=bicycle_parking"],
  },
  {
    id: "bicycle-rental",
    name: "Bicycle Rentals",
    description: "Bicycle rental facilities and stations",
    overpassQuery: createAreaQuery([
      'node["amenity"="bicycle_rental"](area.searchArea);',
      'way["amenity"="bicycle_rental"](area.searchArea);',
      'relation["amenity"="bicycle_rental"](area.searchArea);',
    ]),
    category: "transportation",
    tags: ["amenity=bicycle_rental"],
  },
  {
    id: "bicycle-shop",
    name: "Bicycle Shops",
    description: "Bicycle sales and repair shops",
    overpassQuery: createAreaQuery([
      'node["shop"="bicycle"](area.searchArea);',
      'way["shop"="bicycle"](area.searchArea);',
      'relation["shop"="bicycle"](area.searchArea);',
    ]),
    category: "transportation",
    tags: ["shop=bicycle"],
  },
  {
    id: "bus-stops",
    name: "Bus Stops",
    description: "Public transport bus stops",
    overpassQuery: createAreaQuery([
      'node["highway"="bus_stop"](area.searchArea);',
      'node["public_transport"="stop_position"]["bus"="yes"](area.searchArea);',
    ]),
    category: "transportation",
    tags: ["highway=bus_stop", "public_transport=stop_position"],
  },
  {
    id: "atms",
    name: "ATMs",
    description: "Automated Teller Machines",
    overpassQuery: createAreaQuery([
      'node["amenity"="atm"](area.searchArea);',
      'way["amenity"="atm"](area.searchArea);',
    ]),
    category: "financial",
    tags: ["amenity=atm"],
  },
  {
    id: "public-toilets",
    name: "Public Toilets",
    description: "Public restroom facilities",
    overpassQuery: createAreaQuery([
      'node["amenity"="toilets"](area.searchArea);',
      'way["amenity"="toilets"](area.searchArea);',
    ]),
    category: "amenities",
    tags: ["amenity=toilets"],
  },
  {
    id: "drinking-water",
    name: "Drinking Water",
    description: "Public drinking water fountains and taps",
    overpassQuery: createAreaQuery([
      'node["amenity"="drinking_water"](area.searchArea);',
      'way["amenity"="drinking_water"](area.searchArea);',
    ]),
    category: "amenities",
    tags: ["amenity=drinking_water"],
  },
  {
    id: "ev-charging",
    name: "Electric Vehicle Charging",
    description: "Electric vehicle charging stations (EVCS)",
    overpassQuery: createAreaQuery([
      'node["amenity"="charging_station"](area.searchArea);',
      'way["amenity"="charging_station"](area.searchArea);',
    ]),
    category: "transportation",
    tags: ["amenity=charging_station"],
  },
  {
    id: "hospitals",
    name: "Hospitals",
    description: "Hospital facilities",
    overpassQuery: createAreaQuery([
      'node["amenity"="hospital"](area.searchArea);',
      'way["amenity"="hospital"](area.searchArea);',
      'relation["amenity"="hospital"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=hospital"],
  },
  {
    id: "clinics",
    name: "Clinics",
    description: "Medical clinics and health centers",
    overpassQuery: createAreaQuery([
      'node["amenity"="clinic"](area.searchArea);',
      'way["amenity"="clinic"](area.searchArea);',
      'relation["amenity"="clinic"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=clinic"],
  },
  {
    id: "doctors",
    name: "Doctors",
    description: "Doctor offices and medical practices",
    overpassQuery: createAreaQuery([
      'node["amenity"="doctors"](area.searchArea);',
      'way["amenity"="doctors"](area.searchArea);',
      'relation["amenity"="doctors"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=doctors"],
  },
  {
    id: "dentists",
    name: "Dentists",
    description: "Dental offices and practices",
    overpassQuery: createAreaQuery([
      'node["amenity"="dentist"](area.searchArea);',
      'way["amenity"="dentist"](area.searchArea);',
      'relation["amenity"="dentist"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=dentist"],
  },
  {
    id: "pharmacies",
    name: "Pharmacies",
    description: "Pharmacy and drug stores",
    overpassQuery: createAreaQuery([
      'node["amenity"="pharmacy"](area.searchArea);',
      'way["amenity"="pharmacy"](area.searchArea);',
      'relation["amenity"="pharmacy"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=pharmacy"],
  },
  {
    id: "schools",
    name: "Schools",
    description: "Primary and secondary schools",
    overpassQuery: createAreaQuery([
      'node["amenity"="school"](area.searchArea);',
      'way["amenity"="school"](area.searchArea);',
      'relation["amenity"="school"](area.searchArea);',
    ]),
    category: "education",
    tags: ["amenity=school"],
  },
  {
    id: "universities",
    name: "Universities",
    description: "University and higher education institutions",
    overpassQuery: createAreaQuery([
      'node["amenity"="university"](area.searchArea);',
      'way["amenity"="university"](area.searchArea);',
      'relation["amenity"="university"](area.searchArea);',
    ]),
    category: "education",
    tags: ["amenity=university"],
  },
  {
    id: "libraries",
    name: "Libraries",
    description: "Public and private libraries",
    overpassQuery: createAreaQuery([
      'node["amenity"="library"](area.searchArea);',
      'way["amenity"="library"](area.searchArea);',
      'relation["amenity"="library"](area.searchArea);',
    ]),
    category: "education",
    tags: ["amenity=library"],
  },
  {
    id: "hotels",
    name: "Hotels",
    description: "Hotel accommodations",
    overpassQuery: createAreaQuery([
      'node["tourism"="hotel"](area.searchArea);',
      'way["tourism"="hotel"](area.searchArea);',
      'relation["tourism"="hotel"](area.searchArea);',
    ]),
    category: "tourism",
    tags: ["tourism=hotel"],
  },
  {
    id: "cinemas",
    name: "Cinemas",
    description: "Movie theaters and cinemas",
    overpassQuery: createAreaQuery([
      'node["amenity"="cinema"](area.searchArea);',
      'way["amenity"="cinema"](area.searchArea);',
      'relation["amenity"="cinema"](area.searchArea);',
    ]),
    category: "culture",
    tags: ["amenity=cinema"],
  },
  {
    id: "monuments",
    name: "Monuments",
    description: "Historical monuments and landmarks",
    overpassQuery: createAreaQuery([
      'node["historic"="monument"](area.searchArea);',
      'way["historic"="monument"](area.searchArea);',
      'relation["historic"="monument"](area.searchArea);',
    ]),
    category: "culture",
    tags: ["historic=monument"],
  },
  {
    id: "health-post",
    name: "Health Posts",
    description: "Community health posts and basic health facilities",
    overpassQuery: createAreaQuery([
      'node["amenity"="health_post"](area.searchArea);',
      'way["amenity"="health_post"](area.searchArea);',
      'relation["amenity"="health_post"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=health_post"],
  },
  {
    id: "nursing-home",
    name: "Nursing Homes",
    description: "Nursing homes and elderly care facilities",
    overpassQuery: createAreaQuery([
      'node["amenity"="nursing_home"](area.searchArea);',
      'way["amenity"="nursing_home"](area.searchArea);',
      'relation["amenity"="nursing_home"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=nursing_home"],
  },
  {
    id: "veterinary",
    name: "Veterinaries",
    description: "Veterinary clinics and animal hospitals",
    overpassQuery: createAreaQuery([
      'node["amenity"="veterinary"](area.searchArea);',
      'way["amenity"="veterinary"](area.searchArea);',
      'relation["amenity"="veterinary"](area.searchArea);',
    ]),
    category: "healthcare",
    tags: ["amenity=veterinary"],
  },
  {
    id: "social-facility",
    name: "Social Facilities",
    description: "Social service facilities and community support centers",
    overpassQuery: createAreaQuery([
      'node["amenity"="social_facility"](area.searchArea);',
      'way["amenity"="social_facility"](area.searchArea);',
      'relation["amenity"="social_facility"](area.searchArea);',
    ]),
    category: "social",
    tags: ["amenity=social_facility"],
  },
  {
    id: "community-centre",
    name: "Community Centres",
    description: "Community centers and meeting places",
    overpassQuery: createAreaQuery([
      'node["amenity"="community_centre"](area.searchArea);',
      'way["amenity"="community_centre"](area.searchArea);',
      'relation["amenity"="community_centre"](area.searchArea);',
    ]),
    category: "social",
    tags: ["amenity=community_centre"],
  },
  {
    id: "kindergarten",
    name: "Kindergartens",
    description: "Kindergarten and early childhood education facilities",
    overpassQuery: createAreaQuery([
      'node["amenity"="kindergarten"](area.searchArea);',
      'way["amenity"="kindergarten"](area.searchArea);',
      'relation["amenity"="kindergarten"](area.searchArea);',
    ]),
    category: "education",
    tags: ["amenity=kindergarten"],
  },
  {
    id: "college",
    name: "Colleges",
    description: "Colleges and technical education institutions",
    overpassQuery: createAreaQuery([
      'node["amenity"="college"](area.searchArea);',
      'way["amenity"="college"](area.searchArea);',
      'relation["amenity"="college"](area.searchArea);',
    ]),
    category: "education",
    tags: ["amenity=college"],
  },
  {
    id: "arts-centre",
    name: "Arts Centres",
    description: "Arts centers and cultural facilities",
    overpassQuery: createAreaQuery([
      'node["amenity"="arts_centre"](area.searchArea);',
      'way["amenity"="arts_centre"](area.searchArea);',
      'relation["amenity"="arts_centre"](area.searchArea);',
    ]),
    category: "culture",
    tags: ["amenity=arts_centre"],
  },
  {
    id: "gallery",
    name: "Galleries",
    description: "Art galleries and exhibition spaces",
    overpassQuery: createAreaQuery([
      'node["tourism"="gallery"](area.searchArea);',
      'way["tourism"="gallery"](area.searchArea);',
      'relation["tourism"="gallery"](area.searchArea);',
    ]),
    category: "culture",
    tags: ["tourism=gallery"],
  },
  {
    id: "memorials",
    name: "Memorials",
    description: "Memorials and remembrance sites",
    overpassQuery: createAreaQuery([
      'node["historic"="memorial"](area.searchArea);',
      'way["historic"="memorial"](area.searchArea);',
      'relation["historic"="memorial"](area.searchArea);',
    ]),
    category: "culture",
    tags: ["historic=memorial"],
  },
  {
    id: "heritage",
    name: "Heritage",
    description: "Heritage sites and protected cultural areas",
    overpassQuery: createAreaQuery([
      'node["heritage"](area.searchArea);',
      'way["heritage"](area.searchArea);',
      'relation["heritage"](area.searchArea);',
    ]),
    category: "culture",
    tags: ["heritage"],
  },
  {
    id: "government-office",
    name: "Government Offices",
    description: "Government administrative offices and services",
    overpassQuery: createAreaQuery([
      'node["office"="government"](area.searchArea);',
      'way["office"="government"](area.searchArea);',
      'relation["office"="government"](area.searchArea);',
    ]),
    category: "government",
    tags: ["office=government"],
  },
  {
    id: "waterfall",
    name: "Waterfalls",
    description: "Natural waterfalls and cascades",
    overpassQuery: createAreaQuery([
      'node["waterway"="waterfall"](area.searchArea);',
      'way["waterway"="waterfall"](area.searchArea);',
      'relation["waterway"="waterfall"](area.searchArea);',
    ]),
    category: "environment",
    tags: ["waterway=waterfall"],
  },
  {
    id: "tailings-pond",
    name: "Tailings Ponds",
    description: "Mining tailings ponds and waste storage areas",
    overpassQuery: createAreaQuery([
      'node["man_made"="tailings_pond"](area.searchArea);',
      'way["man_made"="tailings_pond"](area.searchArea);',
      'relation["man_made"="tailings_pond"](area.searchArea);',
    ]),
    category: "environment",
    tags: ["man_made=tailings_pond"],
  },
  {
    id: "dam",
    name: "Dams",
    description: "Dams and water control structures",
    overpassQuery: createAreaQuery([
      'node["waterway"="dam"](area.searchArea);',
      'way["waterway"="dam"](area.searchArea);',
      'relation["waterway"="dam"](area.searchArea);',
    ]),
    category: "environment",
    tags: ["waterway=dam"],
  },
  {
    id: "guest-house",
    name: "Guest Houses",
    description: "Guest houses and bed & breakfast accommodations",
    overpassQuery: createAreaQuery([
      'node["tourism"="guest_house"](area.searchArea);',
      'way["tourism"="guest_house"](area.searchArea);',
      'relation["tourism"="guest_house"](area.searchArea);',
    ]),
    category: "tourism",
    tags: ["tourism=guest_house"],
  },
  {
    id: "sport",
    name: "Sports",
    description: "Sports facilities and recreational areas",
    overpassQuery: createAreaQuery([
      'node["sport"](area.searchArea);',
      'way["sport"](area.searchArea);',
      'relation["sport"](area.searchArea);',
    ]),
    category: "leisure",
    tags: ["sport"],
  },
];

async function main() {
  console.log("Start seeding...");

  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        description: template.description,
        overpassQuery: template.overpassQuery,
        category: template.category,
        tags: template.tags,
      },
      create: template,
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
