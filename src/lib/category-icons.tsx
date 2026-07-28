import {
  Ambulance,
  Anchor,
  Antenna,
  Apple,
  Baby,
  Banknote,
  BedDouble,
  Beef,
  Beer,
  Bike,
  Binoculars,
  BrickWall,
  Building,
  Building2,
  Bus,
  Cable,
  Camera,
  Car,
  CarTaxiFront,
  Caravan,
  Carrot,
  Cctv,
  Church,
  Clock,
  Coffee,
  Construction,
  Croissant,
  Cross,
  Crosshair,
  Cylinder,
  Dog,
  DollarSign,
  DoorOpen,
  Dribbble,
  Droplet,
  Droplets,
  Dumbbell,
  Egg,
  Factory,
  Fence,
  Film,
  FireExtinguisher,
  Flower2,
  Footprints,
  Fuel,
  Gauge,
  Gem,
  Glasses,
  Goal,
  GraduationCap,
  Hammer,
  Heart,
  HeartHandshake,
  Home,
  Hospital,
  Hotel,
  IceCreamCone,
  Images,
  Info,
  LandPlot,
  Landmark,
  Leaf,
  LibraryBig,
  Lightbulb,
  Mail,
  MapPin,
  Martini,
  Medal,
  Milk,
  MoonStar,
  Mountain,
  MountainSnow,
  Package,
  Palette,
  PawPrint,
  PersonStanding,
  Phone,
  Pill,
  RadioTower,
  Recycle,
  Repeat,
  RockingChair,
  Route,
  Sandwich,
  Scale,
  School,
  Shield,
  ShieldAlert,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shrub,
  Signpost,
  Siren,
  Smartphone,
  Smile,
  Snowflake,
  Sofa,
  Sprout,
  Square,
  SquareParking,
  Star,
  Stethoscope,
  Store,
  Target,
  Tent,
  Theater,
  ThermometerSun,
  Toilet,
  ToyBrick,
  Tractor,
  TrafficCone,
  Train,
  TrainFront,
  TramFront,
  Trash2,
  TreeDeciduous,
  TreePalm,
  TreePine,
  Trees,
  TriangleAlert,
  Trophy,
  Tv,
  Users,
  Utensils,
  UtensilsCrossed,
  Volleyball,
  Warehouse,
  Waves,
  Waypoints,
  Wheat,
  Wifi,
  Wrench,
  Zap
} from "lucide-react";

/**
 * Icon lookups for dataset templates and categories
 *
 * AUTO-GENERATED from prisma/templates.yml - DO NOT EDIT DIRECTLY
 * Generated: 2026-07-28T15:16:29.042Z
 * Regenerate with: pnpm generate-icons
 */

/**
 * Get the icon for a category (case-insensitive)
 *
 * @example
 * getCategoryIcon("education"); // Returns School icon
 */
export function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case "agriculture":
      return <Wheat className="w-5 h-5" />;
    case "amenities":
      return <Heart className="w-5 h-5" />;
    case "barriers":
      return <Square className="w-5 h-5" />;
    case "culture":
      return <Palette className="w-5 h-5" />;
    case "education":
      return <School className="w-5 h-5" />;
    case "emergency":
      return <ShieldAlert className="w-5 h-5" />;
    case "environment":
      return <Leaf className="w-5 h-5" />;
    case "financial":
      return <DollarSign className="w-5 h-5" />;
    case "food":
      return <Utensils className="w-5 h-5" />;
    case "government":
      return <Shield className="w-5 h-5" />;
    case "healthcare":
      return <Hospital className="w-5 h-5" />;
    case "housing":
      return <Building2 className="w-5 h-5" />;
    case "infrastructure":
      return <Gauge className="w-5 h-5" />;
    case "leisure":
      return <TreePine className="w-5 h-5" />;
    case "nature":
      return <Leaf className="w-5 h-5" />;
    case "public":
      return <Info className="w-5 h-5" />;
    case "religion":
      return <Landmark className="w-5 h-5" />;
    case "services":
      return <Wrench className="w-5 h-5" />;
    case "shops":
      return <ShoppingBag className="w-5 h-5" />;
    case "social":
      return <Users className="w-5 h-5" />;
    case "sports":
      return <Trophy className="w-5 h-5" />;
    case "tourism":
      return <Camera className="w-5 h-5" />;
    case "traffic":
      return <TrafficCone className="w-5 h-5" />;
    case "transport":
      return <Car className="w-5 h-5" />;
    case "transport_infrastructure":
      return <Route className="w-5 h-5" />;
    case "transportation":
      return <Car className="w-5 h-5" />;
    default:
      return <MapPin className="w-5 h-5" />;
  }
}

/**
 * Get the icon for a template (case-insensitive template slug),
 * falling back to the template's category icon
 *
 * @example
 * getTemplateIcon("drinking-water", "amenities"); // Returns Droplet icon
 */
export function getTemplateIcon(templateId: string, category: string) {
  switch (templateId.toLowerCase()) {
    case "agricultural-buildings":
      return <Warehouse className="w-5 h-5" />;
    case "agricultural-tanks":
      return <Cylinder className="w-5 h-5" />;
    case "alpine-huts":
      return <Mountain className="w-5 h-5" />;
    case "ambulance-stations":
      return <Ambulance className="w-5 h-5" />;
    case "animal-keeping":
      return <PawPrint className="w-5 h-5" />;
    case "apartments":
      return <Building2 className="w-5 h-5" />;
    case "archery":
      return <Crosshair className="w-5 h-5" />;
    case "arts-centre":
      return <Palette className="w-5 h-5" />;
    case "athletics":
      return <Medal className="w-5 h-5" />;
    case "atms":
      return <Banknote className="w-5 h-5" />;
    case "attractions":
      return <Star className="w-5 h-5" />;
    case "bakeries":
      return <Croissant className="w-5 h-5" />;
    case "banks":
      return <Landmark className="w-5 h-5" />;
    case "barns":
      return <Warehouse className="w-5 h-5" />;
    case "bars":
      return <Martini className="w-5 h-5" />;
    case "baseball":
      return <Trophy className="w-5 h-5" />;
    case "basketball":
      return <Dribbble className="w-5 h-5" />;
    case "beaches":
      return <TreePalm className="w-5 h-5" />;
    case "benches":
      return <RockingChair className="w-5 h-5" />;
    case "bicycle-infrastructure":
      return <Bike className="w-5 h-5" />;
    case "bicycle-parking":
      return <Bike className="w-5 h-5" />;
    case "bicycle-rental":
      return <Bike className="w-5 h-5" />;
    case "bicycle-shop":
      return <Bike className="w-5 h-5" />;
    case "bridges":
      return <Waypoints className="w-5 h-5" />;
    case "bunker-silos":
      return <Warehouse className="w-5 h-5" />;
    case "bus-stops":
      return <Bus className="w-5 h-5" />;
    case "butchers":
      return <Beef className="w-5 h-5" />;
    case "cafes":
      return <Coffee className="w-5 h-5" />;
    case "campsites":
      return <Tent className="w-5 h-5" />;
    case "caravan-sites":
      return <Caravan className="w-5 h-5" />;
    case "caves":
      return <Mountain className="w-5 h-5" />;
    case "chalets":
      return <Home className="w-5 h-5" />;
    case "chemist":
      return <Pill className="w-5 h-5" />;
    case "chimney":
      return <Factory className="w-5 h-5" />;
    case "church":
      return <Church className="w-5 h-5" />;
    case "cinemas":
      return <Film className="w-5 h-5" />;
    case "cliffs":
      return <Mountain className="w-5 h-5" />;
    case "climbing":
      return <Mountain className="w-5 h-5" />;
    case "clinics":
      return <Stethoscope className="w-5 h-5" />;
    case "clocks":
      return <Clock className="w-5 h-5" />;
    case "clothes":
      return <Shirt className="w-5 h-5" />;
    case "coastlines":
      return <Waves className="w-5 h-5" />;
    case "college":
      return <GraduationCap className="w-5 h-5" />;
    case "communications-tower":
      return <Antenna className="w-5 h-5" />;
    case "community-centre":
      return <Users className="w-5 h-5" />;
    case "convenience":
      return <Store className="w-5 h-5" />;
    case "courts":
      return <Scale className="w-5 h-5" />;
    case "cowsheds":
      return <PawPrint className="w-5 h-5" />;
    case "crossings":
      return <Footprints className="w-5 h-5" />;
    case "cycleways":
      return <Bike className="w-5 h-5" />;
    case "dairy-yards":
      return <Milk className="w-5 h-5" />;
    case "dam":
      return <Construction className="w-5 h-5" />;
    case "dentists":
      return <Smile className="w-5 h-5" />;
    case "department-stores":
      return <Store className="w-5 h-5" />;
    case "diy":
      return <Wrench className="w-5 h-5" />;
    case "doctors":
      return <Stethoscope className="w-5 h-5" />;
    case "dog-parks":
      return <Dog className="w-5 h-5" />;
    case "dormitories":
      return <Building className="w-5 h-5" />;
    case "drinking-water":
      return <Droplet className="w-5 h-5" />;
    case "electronics":
      return <Tv className="w-5 h-5" />;
    case "emergency-phones":
      return <Phone className="w-5 h-5" />;
    case "equestrian":
      return <PawPrint className="w-5 h-5" />;
    case "ev-charging":
      return <Zap className="w-5 h-5" />;
    case "farm-auxiliary":
      return <Wrench className="w-5 h-5" />;
    case "farmland":
      return <Wheat className="w-5 h-5" />;
    case "farmyards":
      return <Tractor className="w-5 h-5" />;
    case "fast-food":
      return <Sandwich className="w-5 h-5" />;
    case "feedlots":
      return <PawPrint className="w-5 h-5" />;
    case "fell":
      return <Mountain className="w-5 h-5" />;
    case "fences":
      return <Fence className="w-5 h-5" />;
    case "ferry-terminals":
      return <Ship className="w-5 h-5" />;
    case "fire-stations":
      return <FireExtinguisher className="w-5 h-5" />;
    case "fitness-centers":
      return <Dumbbell className="w-5 h-5" />;
    case "fitness-stations":
      return <PersonStanding className="w-5 h-5" />;
    case "football":
      return <Volleyball className="w-5 h-5" />;
    case "footways":
      return <Footprints className="w-5 h-5" />;
    case "forests":
      return <Trees className="w-5 h-5" />;
    case "fountains":
      return <Droplets className="w-5 h-5" />;
    case "fuel":
      return <Fuel className="w-5 h-5" />;
    case "furniture":
      return <Sofa className="w-5 h-5" />;
    case "gallery":
      return <Images className="w-5 h-5" />;
    case "gardens":
      return <Flower2 className="w-5 h-5" />;
    case "gates":
      return <DoorOpen className="w-5 h-5" />;
    case "geyser":
      return <Droplets className="w-5 h-5" />;
    case "glaciers":
      return <MountainSnow className="w-5 h-5" />;
    case "golf":
      return <LandPlot className="w-5 h-5" />;
    case "golf-courses":
      return <LandPlot className="w-5 h-5" />;
    case "government-office":
      return <Landmark className="w-5 h-5" />;
    case "grasslands":
      return <Sprout className="w-5 h-5" />;
    case "greengrocers":
      return <Carrot className="w-5 h-5" />;
    case "greenhouse-horticulture":
      return <Sprout className="w-5 h-5" />;
    case "greenhouses":
      return <Sprout className="w-5 h-5" />;
    case "guideposts":
      return <Signpost className="w-5 h-5" />;
    case "gymnasiums":
      return <Dumbbell className="w-5 h-5" />;
    case "hardware":
      return <Hammer className="w-5 h-5" />;
    case "health-post":
      return <Cross className="w-5 h-5" />;
    case "heath":
      return <Leaf className="w-5 h-5" />;
    case "hedges":
      return <Shrub className="w-5 h-5" />;
    case "hospitals":
      return <Hospital className="w-5 h-5" />;
    case "hot-springs":
      return <ThermometerSun className="w-5 h-5" />;
    case "hotel-guesthouse":
      return <BedDouble className="w-5 h-5" />;
    case "hotels":
      return <Hotel className="w-5 h-5" />;
    case "houses":
      return <Home className="w-5 h-5" />;
    case "ice-cream":
      return <IceCreamCone className="w-5 h-5" />;
    case "ice-hockey":
      return <Snowflake className="w-5 h-5" />;
    case "ice-rinks":
      return <Snowflake className="w-5 h-5" />;
    case "ice-skating":
      return <Snowflake className="w-5 h-5" />;
    case "information-boards":
      return <Info className="w-5 h-5" />;
    case "internet-access":
      return <Wifi className="w-5 h-5" />;
    case "irrigated-green":
      return <Droplet className="w-5 h-5" />;
    case "jewelry":
      return <Gem className="w-5 h-5" />;
    case "kindergarten":
      return <Baby className="w-5 h-5" />;
    case "libraries":
      return <LibraryBig className="w-5 h-5" />;
    case "livestock-buildings":
      return <PawPrint className="w-5 h-5" />;
    case "managed-green":
      return <Leaf className="w-5 h-5" />;
    case "manure-storage":
      return <Package className="w-5 h-5" />;
    case "marinas":
      return <Anchor className="w-5 h-5" />;
    case "markers":
      return <MapPin className="w-5 h-5" />;
    case "mast":
      return <RadioTower className="w-5 h-5" />;
    case "meadows":
      return <Leaf className="w-5 h-5" />;
    case "memorials":
      return <Landmark className="w-5 h-5" />;
    case "mobile-phone":
      return <Smartphone className="w-5 h-5" />;
    case "monuments":
      return <Landmark className="w-5 h-5" />;
    case "moor":
      return <Leaf className="w-5 h-5" />;
    case "mosque":
      return <MoonStar className="w-5 h-5" />;
    case "mud":
      return <Droplets className="w-5 h-5" />;
    case "multi-sport":
      return <Trophy className="w-5 h-5" />;
    case "museums":
      return <Landmark className="w-5 h-5" />;
    case "natural-surfaces":
      return <Mountain className="w-5 h-5" />;
    case "natural-vegetation":
      return <Trees className="w-5 h-5" />;
    case "nature-reserves":
      return <Trees className="w-5 h-5" />;
    case "nursing-home":
      return <BedDouble className="w-5 h-5" />;
    case "optician":
      return <Glasses className="w-5 h-5" />;
    case "orchards":
      return <Apple className="w-5 h-5" />;
    case "parcel-lockers":
      return <Package className="w-5 h-5" />;
    case "parking":
      return <SquareParking className="w-5 h-5" />;
    case "parks":
      return <TreePine className="w-5 h-5" />;
    case "peaks":
      return <Mountain className="w-5 h-5" />;
    case "pharmacies":
      return <Pill className="w-5 h-5" />;
    case "pig-sties":
      return <PawPrint className="w-5 h-5" />;
    case "pipeline":
      return <Cable className="w-5 h-5" />;
    case "pitches":
      return <Goal className="w-5 h-5" />;
    case "places-of-worship":
      return <Landmark className="w-5 h-5" />;
    case "plant-nurseries":
      return <Sprout className="w-5 h-5" />;
    case "playgrounds":
      return <ToyBrick className="w-5 h-5" />;
    case "police-stations":
      return <Siren className="w-5 h-5" />;
    case "post-offices":
      return <Mail className="w-5 h-5" />;
    case "poultry-yards":
      return <Egg className="w-5 h-5" />;
    case "prisons":
      return <Fence className="w-5 h-5" />;
    case "public-toilets":
      return <Toilet className="w-5 h-5" />;
    case "public-transit":
      return <Train className="w-5 h-5" />;
    case "pubs":
      return <Beer className="w-5 h-5" />;
    case "pumping-station":
      return <Gauge className="w-5 h-5" />;
    case "railway-stations":
      return <Train className="w-5 h-5" />;
    case "recycling":
      return <Recycle className="w-5 h-5" />;
    case "residential":
      return <Building2 className="w-5 h-5" />;
    case "restaurants":
      return <UtensilsCrossed className="w-5 h-5" />;
    case "roads":
      return <Route className="w-5 h-5" />;
    case "rock":
      return <Mountain className="w-5 h-5" />;
    case "sand":
      return <Mountain className="w-5 h-5" />;
    case "schools":
      return <School className="w-5 h-5" />;
    case "scrub":
      return <Shrub className="w-5 h-5" />;
    case "senior-centers":
      return <Users className="w-5 h-5" />;
    case "shingle":
      return <Mountain className="w-5 h-5" />;
    case "shoes":
      return <Footprints className="w-5 h-5" />;
    case "shooting":
      return <Target className="w-5 h-5" />;
    case "shopping-malls":
      return <ShoppingBag className="w-5 h-5" />;
    case "shrine":
      return <Landmark className="w-5 h-5" />;
    case "silos":
      return <Warehouse className="w-5 h-5" />;
    case "skiing":
      return <MountainSnow className="w-5 h-5" />;
    case "slurry-basins":
      return <Droplet className="w-5 h-5" />;
    case "slurry-tanks":
      return <Droplet className="w-5 h-5" />;
    case "social-facility":
      return <HeartHandshake className="w-5 h-5" />;
    case "speed-cameras":
      return <Camera className="w-5 h-5" />;
    case "sports-centres":
      return <Dumbbell className="w-5 h-5" />;
    case "springs":
      return <Droplets className="w-5 h-5" />;
    case "stables":
      return <PawPrint className="w-5 h-5" />;
    case "stadiums":
      return <Trophy className="w-5 h-5" />;
    case "stockyards":
      return <PawPrint className="w-5 h-5" />;
    case "stone":
      return <Mountain className="w-5 h-5" />;
    case "storage-tanks":
      return <Cylinder className="w-5 h-5" />;
    case "street-lamps":
      return <Lightbulb className="w-5 h-5" />;
    case "street-trees":
      return <TreeDeciduous className="w-5 h-5" />;
    case "subway-entrances":
      return <TrainFront className="w-5 h-5" />;
    case "supermarkets":
      return <ShoppingCart className="w-5 h-5" />;
    case "surveillance":
      return <Cctv className="w-5 h-5" />;
    case "swimming":
      return <Waves className="w-5 h-5" />;
    case "swimming-pools":
      return <Waves className="w-5 h-5" />;
    case "synagogue":
      return <Star className="w-5 h-5" />;
    case "tailings-pond":
      return <Factory className="w-5 h-5" />;
    case "taxi-ranks":
      return <CarTaxiFront className="w-5 h-5" />;
    case "telephones":
      return <Phone className="w-5 h-5" />;
    case "temple":
      return <Landmark className="w-5 h-5" />;
    case "tennis":
      return <Trophy className="w-5 h-5" />;
    case "theatres":
      return <Theater className="w-5 h-5" />;
    case "tower":
      return <RadioTower className="w-5 h-5" />;
    case "town-halls":
      return <Landmark className="w-5 h-5" />;
    case "tracks":
      return <Repeat className="w-5 h-5" />;
    case "traffic-calming":
      return <TrafficCone className="w-5 h-5" />;
    case "traffic-lights":
      return <Lightbulb className="w-5 h-5" />;
    case "traffic-signs":
      return <Signpost className="w-5 h-5" />;
    case "tram-stops":
      return <TramFront className="w-5 h-5" />;
    case "trees-with-species":
      return <Leaf className="w-5 h-5" />;
    case "tunnels":
      return <Route className="w-5 h-5" />;
    case "universities":
      return <GraduationCap className="w-5 h-5" />;
    case "urban-trees":
      return <TreePine className="w-5 h-5" />;
    case "utility-pole":
      return <Cable className="w-5 h-5" />;
    case "vegetation-risk-context":
      return <TriangleAlert className="w-5 h-5" />;
    case "veterinary":
      return <PawPrint className="w-5 h-5" />;
    case "viewpoints":
      return <Binoculars className="w-5 h-5" />;
    case "walls":
      return <BrickWall className="w-5 h-5" />;
    case "waste-disposal":
      return <Trash2 className="w-5 h-5" />;
    case "wastewater-plant":
      return <Factory className="w-5 h-5" />;
    case "water":
      return <Droplet className="w-5 h-5" />;
    case "water-tower":
      return <Droplet className="w-5 h-5" />;
    case "water-works":
      return <Droplets className="w-5 h-5" />;
    case "waterfall":
      return <Waves className="w-5 h-5" />;
    case "wetlands":
      return <Droplets className="w-5 h-5" />;
    case "wilderness-huts":
      return <Tent className="w-5 h-5" />;
    case "woods":
      return <TreePine className="w-5 h-5" />;
    default:
      return getCategoryIcon(category);
  }
}
