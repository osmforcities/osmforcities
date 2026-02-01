import {
  AlertTriangle,
  Bike,
  Building2,
  Camera,
  Car,
  DollarSign,
  Goal,
  Hospital,
  Info,
  Leaf,
  Lightbulb,
  MapPin,
  Palette,
  Route,
  School,
  Shield,
  ShoppingBag,
  Signpost,
  Square,
  Toilet,
  TreePine,
  Users,
  Utensils,
  Wheat,
  Wrench,
} from "lucide-react";

/**
 * Get appropriate icon for a category
 *
 * AUTO-GENERATED from prisma/templates.yml - DO NOT EDIT DIRECTLY
 * Generated: 2026-01-30T02:20:09.869Z
 * Regenerate with: pnpm generate-icons
 *
 * @param category - Category name (case-insensitive)
 * @returns React component for the category icon
 * @example
 * const icon = getCategoryIcon("education"); // Returns School icon
 * const icon = getCategoryIcon("HEALTHCARE"); // Returns Hospital icon
 */
export function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case "agriculture":
      return <Wheat className="w-5 h-5" />;
    case "amenities":
      return <Toilet className="w-5 h-5" />;
    case "barriers":
      return <Square className="w-5 h-5" />;
    case "culture":
      return <Palette className="w-5 h-5" />;
    case "education":
      return <School className="w-5 h-5" />;
    case "emergency":
      return <AlertTriangle className="w-5 h-5" />;
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
      return <Lightbulb className="w-5 h-5" />;
    case "leisure":
      return <TreePine className="w-5 h-5" />;
    case "nature":
      return <TreePine className="w-5 h-5" />;
    case "public":
      return <Info className="w-5 h-5" />;
    case "religion":
      return <Building2 className="w-5 h-5" />;
    case "services":
      return <Wrench className="w-5 h-5" />;
    case "shops":
      return <ShoppingBag className="w-5 h-5" />;
    case "social":
      return <Users className="w-5 h-5" />;
    case "sports":
      return <Goal className="w-5 h-5" />;
    case "tourism":
      return <Camera className="w-5 h-5" />;
    case "traffic":
      return <Signpost className="w-5 h-5" />;
    case "transport":
      return <Car className="w-5 h-5" />;
    case "transport_infrastructure":
      return <Route className="w-5 h-5" />;
    case "transportation":
      return <Bike className="w-5 h-5" />;
    default:
      return <MapPin className="w-5 h-5" />;
  }
}
