import { LucideIcon } from "lucide-react";

export interface BaseItem {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  category?: string;
}

export interface FeatureItem extends BaseItem {
  id: string;
}

export interface UseCaseItem extends BaseItem {
  id: string;
  category: string;
}

export interface DatasetCategory extends BaseItem {
  id: string;
  category: string;
}

export interface GridConfig {
  columns?: 1 | 2 | 3 | 4;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  gap?: "sm" | "md" | "lg";
}

