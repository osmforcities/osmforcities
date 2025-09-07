import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { bbox } from "@turf/bbox";
import type { FeatureCollection, Feature } from "geojson";
import { BboxSchema, type Bbox } from "@/types/geojson";
import type { DateFilter } from "../types/geojson";
import type { Area } from "@/types/area";
import type { useTranslations } from "next-intl";

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

/**
 * Get area characteristics as an array of strings for display
 * @param item - The area item to get characteristics for
 * @param translateAddressType - Function to translate address types
 * @returns Array of characteristic strings
 */
export function getAreaCharacteristics(
  item:
    | Area
    | {
        id: string | number;
        addresstype?: string;
        type?: string;
        country?: string;
        countryCode?: string;
      },
  translateAddressType: ReturnType<typeof useTranslations<"AddressTypes">>
): string[] {
  if (typeof item.id === "string" && item.id === "no-results") return [];

  const characteristics: string[] = [];

  // Add address type
  const addressType = item.addresstype || item.type;
  if (addressType) {
    const translatedType = translateAddressType(addressType as never);

    // If translation returns the same key, it means it's not translated
    // Show the original value with a fallback format
    if (translatedType === addressType) {
      // Convert snake_case to Title Case for better display
      const formattedType = addressType
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      characteristics.push(formattedType);

      // Log untranslated address types for debugging
      if (process.env.NODE_ENV === "development") {
        console.warn(`Untranslated address type: ${addressType}`);
      }
    } else {
      characteristics.push(translatedType);
    }
  }

  // Add country
  if (item.country) {
    characteristics.push(item.country);
  } else if (item.countryCode) {
    characteristics.push(item.countryCode.toUpperCase());
  }

  // Add relation ID
  characteristics.push(`ID: ${item.id}`);

  return characteristics;
}
