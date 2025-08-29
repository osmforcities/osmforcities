import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { bbox } from "@turf/bbox";
import type { FeatureCollection, Feature } from "geojson";
import { BboxSchema, type Bbox } from "@/types/geojson";
import type { DateFilter } from "../types/geojson";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Returns the base URL for API route redirects
export function getBaseUrl(request: { url: string }): string {
  if (process.env.NODE_ENV === "production" && process.env.AUTH_URL) {
    return process.env.AUTH_URL.replace(/\/$/, "");
  }
  const url = new URL(request.url);
  return url.origin;
}

export function calculateBbox(geojson: FeatureCollection): Bbox | null {
  if (!geojson.features || geojson.features.length === 0) {
    return null;
  }

  try {
    const turfBbox = bbox(geojson);
    const bboxArray: Bbox = [
      turfBbox[0],
      turfBbox[1],
      turfBbox[2],
      turfBbox[3],
    ];

    // Validate the bbox
    const result = BboxSchema.safeParse(bboxArray);
    return result.success ? bboxArray : null;
  } catch (error) {
    console.error("Error calculating bbox:", error);
    return null;
  }
}

export const getAvailableTimeframes = (features: Feature[]): DateFilter[] => {
  const availableTimeframes: DateFilter[] = ["all"];

  // Check if there are features in each timeframe by calculating age on-demand
  const has7Days = features.some((f) => {
    const timestamp = f.properties?.["@timestamp"] || f.properties?.timestamp;
    if (!timestamp) return false;
    const age = calculateAge(timestamp);
    return age <= 7;
  });

  const has30Days = features.some((f) => {
    const timestamp = f.properties?.["@timestamp"] || f.properties?.timestamp;
    if (!timestamp) return false;
    const age = calculateAge(timestamp);
    return age <= 30;
  });

  const has90Days = features.some((f) => {
    const timestamp = f.properties?.["@timestamp"] || f.properties?.timestamp;
    if (!timestamp) return false;
    const age = calculateAge(timestamp);
    return age <= 90;
  });

  if (has7Days) availableTimeframes.push("7days");
  if (has30Days) availableTimeframes.push("30days");
  if (has90Days) availableTimeframes.push("90days");

  return availableTimeframes;
};

export const calculateAge = (timestamp: string) => {
  const featureDate = new Date(timestamp);
  const currentDate = new Date();

  if (isNaN(featureDate.getTime())) {
    console.warn(`Invalid timestamp: ${timestamp}`);
    return 0;
  }

  const diffTime = Math.abs(currentDate.getTime() - featureDate.getTime());
  const ageInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return ageInDays;
};

export const filterFeaturesByDate = (
  features: Feature[],
  dateFilter: DateFilter
): Feature[] => {
  if (dateFilter === "all") return features;

  const maxAge = dateFilter === "7days" ? 7 : dateFilter === "30days" ? 30 : 90;

  return features.filter((feature) => {
    const timestamp =
      feature.properties?.["@timestamp"] || feature.properties?.timestamp;
    if (!timestamp) return false;
    const age = calculateAge(timestamp);
    return age <= maxAge;
  });
};
