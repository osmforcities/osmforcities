import {
  Building2,
  MapPin,
  Heart,
  School,
  Hospital,
  Car,
  DollarSign,
  Camera,
  Palette,
  Users,
  Shield,
  Leaf,
  Coffee,
} from "lucide-react";

/**
 * Get appropriate icon for a category
 * @param category - Category name (case-insensitive)
 * @returns React component for the category icon
 * @example
 * const icon = getCategoryIcon("education"); // Returns School icon
 * const icon = getCategoryIcon("HEALTHCARE"); // Returns Hospital icon
 */
export function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case "education":
      return <School className="w-5 h-5" />;
    case "healthcare":
      return <Hospital className="w-5 h-5" />;
    case "amenities":
      return <Heart className="w-5 h-5" />;
    case "transportation":
      return <Car className="w-5 h-5" />;
    case "financial":
      return <DollarSign className="w-5 h-5" />;
    case "tourism":
      return <Camera className="w-5 h-5" />;
    case "culture":
      return <Palette className="w-5 h-5" />;
    case "social":
      return <Users className="w-5 h-5" />;
    case "government":
      return <Shield className="w-5 h-5" />;
    case "environment":
      return <Leaf className="w-5 h-5" />;
    case "leisure":
      return <Coffee className="w-5 h-5" />;
    case "infrastructure":
      return <Building2 className="w-5 h-5" />;
    default:
      return <MapPin className="w-5 h-5" />;
  }
}
