import {
  Ambulance,
  Amphora,
  Banknote,
  Bike,
  Building,
  Building2,
  Bus,
  BusFront,
  Camera,
  Castle,
  Droplets,
  Fence,
  FerrisWheel,
  FireExtinguisher,
  Footprints,
  Gavel,
  HeartHandshake,
  HeartPulse,
  Hospital,
  House,
  Landmark,
  Leaf,
  MapPin,
  Megaphone,
  Palette,
  PersonStanding,
  Route,
  School,
  ShoppingBag,
  Siren,
  Sofa,
  TrafficCone,
  Train,
  Trash2,
  Trees,
  Utensils,
  UtilityPole,
  Volleyball,
  Wheat
} from "lucide-react";

/**
 * Icon lookups for dataset templates and categories
 *
 * AUTO-GENERATED from prisma/templates.yml - DO NOT EDIT DIRECTLY
 * Generated: 2026-11-06T05:07:58.365Z
 * Regenerate with: pnpm generate-icons
 */

/**
 * Template icons are Pinhead map icons (CC0, https://pinhead.ink) in one
 * static sprite, so their paths stay out of the client bundle.
 */
const TEMPLATE_ICON_SPRITE = "/template-icons/4c30df6d62e6.svg";

const TEMPLATE_ICONS = new Map<string, string>([
  ["agricultural-tanks", "cylinder"],
  ["alpine-huts", "person_walking_with_hiking_pole_wearing_backpack_in_gable_roofed_shelter"],
  ["alternative-medicine", "lotus_flower"],
  ["ambulance-stations", "compact_box_truck_with_greek_cross"],
  ["apartments", "lowrise_apartment_building"],
  ["archaeological-sites", "amphora"],
  ["archery", "target_with_archery_arrow_at_bullseye"],
  ["arts-centre", "palette"],
  ["artwork", "paintbrush"],
  ["assembly-points", "crowd_of_people"],
  ["athletics", "racetrack_oval_with_dashes"],
  ["atms", "banknote_in_slot"],
  ["attractions", "star"],
  ["bakeries", "loaf_of_bread"],
  ["banks", "banknote"],
  ["barns", "barn"],
  ["bars", "cocktail"],
  ["baseball", "baseball"],
  ["basketball", "basketball"],
  ["beaches", "beach_umbrella_in_ground"],
  ["benches", "bench_with_backrest"],
  ["bicycle-parking", "wide_p_with_bicycle"],
  ["bicycle-rental", "bicycle_and_arrow_right_above_arrow_left"],
  ["bicycle-shop", "bicycle_and_tag"],
  ["blood-donation", "droplet_with_greek_cross"],
  ["bottle-return", "wheelie_bin_and_drink_bottle_and_can"],
  ["bridges", "bridge_tied_arch"],
  ["buildings", "town_buildings"],
  ["bus-lanes", "bus"],
  ["bus-stops", "bus_with_destination_display"],
  ["busways", "bus_within_guideway"],
  ["butchers", "cleaver"],
  ["cafes", "handled_teacup_and_saucer"],
  ["campsites", "campsite"],
  ["caravan-sites", "camper_trailer"],
  ["castles", "castle"],
  ["caves", "cave"],
  ["cemeteries", "memorial_stone"],
  ["chalets", "cabin"],
  ["chemist", "tube_and_toothbrush"],
  ["childcare", "baby"],
  ["chimney", "chimney_with_smoke"],
  ["cinemas", "film_movie_projector"],
  ["cliffs", "cliff_with_rocks"],
  ["climbing", "climbing_wall"],
  ["clinics", "stethoscope"],
  ["clocks", "clock_face"],
  ["clothes", "vneck_tshirt"],
  ["coastlines", "waters_meeting_shore"],
  ["college", "square_academic_cap"],
  ["communications-tower", "lattice_tower_with_ball_tip_antenna_on_ground_with_beams"],
  ["community-centre", "house_with_flag"],
  ["convenience", "milk_carton_and_apple"],
  ["counselling-services", "speech_bubbles"],
  ["courts", "balance_scales"],
  ["crossings", "person_walking_on_crosswalk"],
  ["cycle-lanes", "bicycle_in_rectangle_outline"],
  ["cycleways", "person_riding_bicycle"],
  ["cycling-infrastructure", "bicycle"],
  ["dam", "dam"],
  ["defibrillators", "heart_with_ecg_line"],
  ["dentists", "molar_tooth"],
  ["department-stores", "shopping_bag"],
  ["dialysis-centres", "kidneys"],
  ["diy", "wrench_and_hammer"],
  ["doctors", "stethoscope"],
  ["dog-parks", "dog_wearing_collar"],
  ["dormitories", "people_sleeping_in_bunkbeds"],
  ["drinking-water", "water_tap_with_drinking_glass"],
  ["driving-school", "people_in_car"],
  ["electronics", "plug"],
  ["emergency-phones", "phone_top_right_and_greek_cross"],
  ["emergency-shelters", "gable_roofed_shelter"],
  ["equestrian", "person_riding_horse"],
  ["ev-charging", "charging_station_with_bolt"],
  ["farm-auxiliary", "barn_and_silo"],
  ["farmland", "corn_cob"],
  ["farmyards", "barn_and_silo"],
  ["fast-food", "burger"],
  ["fell", "mountain"],
  ["fences", "picket_fence"],
  ["ferry-terminals", "ferryboat"],
  ["fire-hydrants", "hydrant"],
  ["fire-stations", "badge_shield_with_fire"],
  ["firefighting-water-sources", "storage_tank"],
  ["fitness-centers", "dumbbell"],
  ["fitness-stations", "person_hanging_from_pull_up_bar"],
  ["food-court", "spoon_and_chefs_knife_and_pot"],
  ["food-vending", "vending_machine_with_drink_can"],
  ["football", "soccer_ball"],
  ["footways", "person_walking"],
  ["forests", "conifer_tree"],
  ["fountains", "fountain_from_water"],
  ["fuel", "gasoline_pump"],
  ["furniture", "club_chair"],
  ["gallery", "wall_hanging_with_mountains_and_sun"],
  ["gardens", "tulip"],
  ["gates", "tall_gate"],
  ["geyser", "geyser_from_ground"],
  ["give-box", "giftwrapped_box"],
  ["glaciers", "snowflake"],
  ["golf", "person_swinging_golf_club"],
  ["golf-courses", "person_swinging_golf_club"],
  ["government-office", "classical_building_with_flag"],
  ["grasslands", "grass"],
  ["greengrocers", "banana_and_apple"],
  ["greenhouse-horticulture", "greenhouse"],
  ["greenhouses", "greenhouse"],
  ["gymnasiums", "person_balancing_on_low_mounted_beam"],
  ["hardware", "wrench_and_hammer"],
  ["health-post", "greek_cross"],
  ["heath", "low_shrub"],
  ["hedges", "shrub"],
  ["heritage-sites", "plaque"],
  ["hospitals", "hospital_h"],
  ["hot-springs", "jp_hot_spring"],
  ["hotel-guesthouse", "person_sleeping_in_bed"],
  ["hotels", "bed"],
  ["houses", "house_with_chimney"],
  ["ice-cream", "ice_cream_on_cone"],
  ["ice-rinks", "ice_skate"],
  ["information-boards", "info_i"],
  ["jewelry", "ring_with_jewel"],
  ["kerbs", "lowered_curb_under_shoe"],
  ["kindergarten", "rocking_horse"],
  ["language-school", "graticule_globe"],
  ["libraries", "open_book"],
  ["livestock-buildings", "horse_in_shelter"],
  ["luggage-lockers", "suitcase_under_key"],
  ["managed-green", "leaf"],
  ["marinas", "sailboat"],
  ["markets", "market_stall"],
  ["mast", "guyed_mast"],
  ["meadows", "grass"],
  ["medical-laboratories", "microscope"],
  ["memorials", "memorial_stone_with_inscription"],
  ["midwives", "pregnant_person_standing"],
  ["mobile-phone", "mobile_phone_with_touchscreen_and_antenna"],
  ["monuments", "obelisk_on_plinth"],
  ["motels", "car_beside_person_sleeping_in_bed"],
  ["mud", "waters"],
  ["museums", "classical_building"],
  ["music-school", "eighth_notes"],
  ["natural-surfaces", "squat_rock"],
  ["natural-vegetation", "oval_broadleaved_tree_beside_oval_broadleaved_tree"],
  ["nature-reserves", "broadleaved_tree"],
  ["nursing-home", "person_standing_holding_cane"],
  ["occupational-therapists", "puzzle_piece"],
  ["opticians", "eyeglasses"],
  ["optometrists", "eye"],
  ["orchards", "apple"],
  ["parcel-lockers", "lockers_terminal"],
  ["parking", "car_on_parking_line"],
  ["parks", "tree_beside_bench_with_backrest"],
  ["peaks", "snowcapped_mountain"],
  ["pharmacies", "circular_pill_and_capsule_pill"],
  ["physiotherapists", "person_squatting_beside_person_standing_reaching_up"],
  ["pipeline", "water_pipe_return_bend_with_handle"],
  ["pitches", "person_running"],
  ["places-of-worship", "place_of_worship_building"],
  ["plant-nurseries", "plant"],
  ["playgrounds", "person_sitting_on_swing"],
  ["podiatrists", "foot"],
  ["police-stations", "police_officer"],
  ["post-boxes", "post_box"],
  ["post-offices", "envelope"],
  ["prisons", "barred_door"],
  ["psychotherapists", "human_head"],
  ["public-bookcase", "open_book_under_roof"],
  ["public-toilets", "sitting_tank_toilet"],
  ["public-transit", "transit_vehicle_with_destination_display"],
  ["pubs", "pint_glass"],
  ["pumping-station", "water_pipe_return_bend_with_motor_and_handle"],
  ["rail-tracks", "railway_track"],
  ["railway-stations", "transit_vehicle_on_railway_track"],
  ["recycling", "recycling_symbol"],
  ["rehabilitation-centres", "person_walking_holding_railing"],
  ["research-institute", "book_with_square_academic_cap"],
  ["residential", "lowrise_building_beside_lollipop_tree_on_ground"],
  ["restaurants", "fork_beside_table_knife"],
  ["roads", "sedan"],
  ["rock", "pointy_rock"],
  ["ruins", "megalith"],
  ["sand", "sandbox"],
  ["schools", "paper_and_pencil"],
  ["scrub", "shrub"],
  ["senior-centers", "person_standing_wearing_dress_holding_cane"],
  ["shingle", "round_rock"],
  ["shoes", "shoe"],
  ["shooting", "target"],
  ["shopping-malls", "person_carrying_shopping_bags"],
  ["shower", "showerhead_with_spray"],
  ["shrines", "column_shrine"],
  ["sidewalks", "sign_beside_person_walking"],
  ["silos", "silo"],
  ["sirens", "megaphone"],
  ["skiing", "person_skiing_downhill"],
  ["social-facility", "heart_above_outstretched_hand"],
  ["speech-therapists", "speech_bubble"],
  ["speed-cameras", "wallmounted_surveillance_camera"],
  ["sports-centres", "people_running"],
  ["springs", "droplet_above_water"],
  ["stadiums", "bleachers"],
  ["steps", "stairs"],
  ["stone", "trapezoidal_rock"],
  ["storage-tanks", "cylinder"],
  ["street-lamps", "street_lamp_arm"],
  ["subway-entrances", "transit_vehicle_with_destination_display_on_railway_track_in_tunnel"],
  ["supermarkets", "shopping_cart"],
  ["surveillance", "wallmounted_surveillance_camera"],
  ["swimming", "person_swimming_in_waters"],
  ["swimming-pools", "person_swimming_in_water"],
  ["tailings-pond", "droplet_from_pipes"],
  ["taxi-ranks", "taxi"],
  ["telephones", "phone_top_right"],
  ["tennis", "tennis_ball"],
  ["theatres", "comedy_mask_and_tragedy_mask"],
  ["tower", "lattice_tower_with_observation_deck"],
  ["town-halls", "classical_building_with_flag"],
  ["tracks", "racetrack_oval_with_dashes"],
  ["traffic-calming", "speed_bump"],
  ["traffic-lights", "three_dots_up_down_in_tall_rounded_rectangle"],
  ["traffic-signs", "sign"],
  ["tram-stops", "tram_with_destination_display_and_pantograph_on_tram_track"],
  ["transit-platforms", "person_boarding_transit_vehicle_with_destination_display"],
  ["trees", "oval_broadleaved_tree"],
  ["tunnels", "tunnel"],
  ["universities", "square_academic_cap"],
  ["utility-pole", "utility_pole"],
  ["veterinary", "pawprint_with_greek_cross"],
  ["viewpoints", "person_using_mounted_binoculars"],
  ["walls", "stone_wall"],
  ["waste-basket", "trash_can"],
  ["waste-disposal", "wheelie_bin"],
  ["wastewater-plant", "sewage_pipe_cross_section"],
  ["water", "droplet"],
  ["water-tower", "water_tower"],
  ["water-works", "utility_valve_with_droplet"],
  ["waterfall", "waterfall"],
  ["wetlands", "grass_in_water"],
  ["wilderness-huts", "cabin"],
  ["woods", "conifer_tree_beside_oval_broadleaved_tree"],
]);

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
      return <Sofa className="w-5 h-5" />;
    case "barriers":
      return <Fence className="w-5 h-5" />;
    case "buildings-infrastructure":
      return <Building2 className="w-5 h-5" />;
    case "bus":
      return <Bus className="w-5 h-5" />;
    case "civil-protection":
      return <Megaphone className="w-5 h-5" />;
    case "culture":
      return <Palette className="w-5 h-5" />;
    case "culture-religion":
      return <Amphora className="w-5 h-5" />;
    case "cycling":
      return <Bike className="w-5 h-5" />;
    case "education":
      return <School className="w-5 h-5" />;
    case "emergency":
      return <Siren className="w-5 h-5" />;
    case "environment":
      return <Droplets className="w-5 h-5" />;
    case "financial":
      return <Banknote className="w-5 h-5" />;
    case "firefighting":
      return <FireExtinguisher className="w-5 h-5" />;
    case "food":
      return <Utensils className="w-5 h-5" />;
    case "government":
      return <Gavel className="w-5 h-5" />;
    case "health":
      return <HeartPulse className="w-5 h-5" />;
    case "healthcare":
      return <Hospital className="w-5 h-5" />;
    case "heritage":
      return <Castle className="w-5 h-5" />;
    case "housing":
      return <House className="w-5 h-5" />;
    case "infrastructure":
      return <UtilityPole className="w-5 h-5" />;
    case "leisure":
      return <FerrisWheel className="w-5 h-5" />;
    case "leisure-sports":
      return <PersonStanding className="w-5 h-5" />;
    case "medical-rescue":
      return <Ambulance className="w-5 h-5" />;
    case "mobility":
      return <BusFront className="w-5 h-5" />;
    case "nature":
      return <Trees className="w-5 h-5" />;
    case "nature-environment":
      return <Leaf className="w-5 h-5" />;
    case "pedestrian":
      return <Footprints className="w-5 h-5" />;
    case "public-services":
      return <Landmark className="w-5 h-5" />;
    case "rail":
      return <Train className="w-5 h-5" />;
    case "religion":
      return <Building className="w-5 h-5" />;
    case "roads":
      return <Route className="w-5 h-5" />;
    case "shops":
      return <ShoppingBag className="w-5 h-5" />;
    case "shops-services":
      return <ShoppingBag className="w-5 h-5" />;
    case "social":
      return <HeartHandshake className="w-5 h-5" />;
    case "sports":
      return <Volleyball className="w-5 h-5" />;
    case "tourism":
      return <Camera className="w-5 h-5" />;
    case "traffic":
      return <TrafficCone className="w-5 h-5" />;
    case "waste":
      return <Trash2 className="w-5 h-5" />;
    default:
      return <MapPin className="w-5 h-5" />;
  }
}

/**
 * Get the icon for a template (case-insensitive template slug),
 * falling back to the template's category icon
 *
 * @example
 * getTemplateIcon("drinking-water", "amenities"); // Returns the water tap icon
 */
export function getTemplateIcon(templateId: string, category: string) {
  const icon = TEMPLATE_ICONS.get(templateId.toLowerCase());
  if (!icon) return getCategoryIcon(category);
  return (
    <svg viewBox="0 0 15 15" fill="currentColor" aria-hidden="true" className="w-5 h-5">
      <use href={`${TEMPLATE_ICON_SPRITE}#${icon}`} />
    </svg>
  );
}
