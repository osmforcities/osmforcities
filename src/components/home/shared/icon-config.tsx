import {
  FolderOpen,
  Bell,
  Map,
  Download,
  Building,
  Newspaper,
  Microscope,
  Code,
  Users,
  Heart,
  Home,
  TrendingUp,
  Stethoscope,
  Bike,
  GraduationCap,
  Trophy,
  Droplets,
  Trees,
  Hotel
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export const FEATURE_ICONS = {
  curate: FolderOpen,
  notifications: Bell,
  inspect: Map,
  download: Download
} as const;

export const USE_CASE_ICONS = {
  urbanPlanners: Building,
  journalists: Newspaper,
  researchers: Microscope,
  developers: Code,
  communityGroups: Users,
  publicInstitutions: Heart,
  residents: Home,
  businesses: TrendingUp
} as const;

export const DATASET_ICONS = {
  healthcare: Stethoscope,
  transportation: Bike,
  education: GraduationCap,
  leisure: Trophy,
  amenities: Droplets,
  environment: Trees,
  tourism: Hotel,
  culture: Building,
  social: Users
} as const;

export type IconKey = keyof typeof FEATURE_ICONS | keyof typeof USE_CASE_ICONS | keyof typeof DATASET_ICONS;

export function getIcon(key: IconKey): LucideIcon {
  if (key in FEATURE_ICONS) return FEATURE_ICONS[key as keyof typeof FEATURE_ICONS];
  if (key in USE_CASE_ICONS) return USE_CASE_ICONS[key as keyof typeof USE_CASE_ICONS];
  if (key in DATASET_ICONS) return DATASET_ICONS[key as keyof typeof DATASET_ICONS];
  return Map; // fallback
}