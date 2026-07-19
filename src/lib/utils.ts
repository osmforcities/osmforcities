import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { bbox } from "@turf/bbox";
import type { FeatureCollection } from "geojson";
import { BboxSchema, type Bbox } from "@/types/geojson";
import type { Area } from "@/types/area";
import type { useTranslations } from "next-intl";
import {
  SUPPORTED_LOCALES,
  AREA_BOUNDS_MAX_SPAN_DEG,
  DATASET_MAP_DEFAULT_ZOOM,
} from "./constants";

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

/**
 * Parse area bounds from database format to GeoJSON bbox format.
 * Database stores bounds as comma-separated string: "minLat,minLon,maxLat,maxLon"
 * GeoJSON expects bbox as array: [minLon, minLat, maxLon, maxLat]
 * @param area - Area object with bounds property
 * @returns Bbox if valid, null otherwise
 */
export function parseAreaBounds(area: Pick<Area, "bounds"> | { bounds?: string | null }): Bbox | null {
  if (!area?.bounds) return null;

  try {
    const parts = area.bounds.split(',');
    if (parts.length !== 4) return null;

    const values = parts.map((p) => parseFloat(p));
    if (values.some((v) => isNaN(v))) return null;

    // Database format: [minLat, minLon, maxLat, maxLon]
    // GeoJSON bbox format: [minLon, minLat, maxLon, maxLat]
    const [minLat, minLon, maxLat, maxLon] = values;
    const bounds: Bbox = [minLon, minLat, maxLon, maxLat];

    const result = BboxSchema.safeParse(bounds);
    return result.success ? bounds : null;
  } catch {
    return null;
  }
}

/**
 * Whether an area bbox is small enough that fitting it gives a good initial
 * map view. Large bboxes are untrustworthy (scattered boundaries like Tokyo's
 * outlying islands) and the map should center on the admin centre instead.
 * @param bbox - GeoJSON bbox [minLon, minLat, maxLon, maxLat]
 */
export function isSmallAreaBounds(bbox: Bbox): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const latSpan = maxLat - minLat;
  const midLat = (minLat + maxLat) / 2;
  const lonSpan = (maxLon - minLon) * Math.cos((midLat * Math.PI) / 180);
  return Math.max(latSpan, lonSpan) <= AREA_BOUNDS_MAX_SPAN_DEG;
}

export type InitialViewState =
  | { bounds: Bbox; fitBoundsOptions: { padding: number } }
  | { longitude: number; latitude: number; zoom: number };

/** ~5.5 km: the admin centre can sit just outside a tight data bbox */
const CENTER_NEAR_BOUNDS_TOLERANCE_DEG = 0.05;

function isPointNearBounds(lat: number, lon: number, bbox: Bbox): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const t = CENTER_NEAR_BOUNDS_TOLERANCE_DEG;
  return (
    lat >= minLat - t && lat <= maxLat + t && lon >= minLon - t && lon <= maxLon + t
  );
}

export function computeInitialViewState(
  area: {
    bounds?: string | null;
    centerLat?: number | null;
    centerLon?: number | null;
  },
  dataBounds: Bbox | null
): InitialViewState {
  const areaBounds = parseAreaBounds(area);

  if (areaBounds && isSmallAreaBounds(areaBounds)) {
    return { bounds: areaBounds, fitBoundsOptions: { padding: 20 } };
  }

  if (area.centerLat != null && area.centerLon != null) {
    if (!dataBounds || isPointNearBounds(area.centerLat, area.centerLon, dataBounds)) {
      return {
        longitude: area.centerLon,
        latitude: area.centerLat,
        zoom: DATASET_MAP_DEFAULT_ZOOM,
      };
    }
    // A center far from the data is a bad center (e.g. a Nominatim centroid)
    return { bounds: dataBounds, fitBoundsOptions: { padding: 20 } };
  }

  if (areaBounds) {
    return { bounds: areaBounds, fitBoundsOptions: { padding: 20 } };
  }

  if (dataBounds) {
    return { bounds: dataBounds, fitBoundsOptions: { padding: 20 } };
  }

  return { longitude: 0, latitude: 0, zoom: 2 };
}

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
    try {
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
    } catch (error) {
      // Fallback to formatted original value if translation fails
      const formattedType = addressType
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      characteristics.push(formattedType);

      // Log translation errors for debugging
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `Translation error for address type "${addressType}":`,
          error
        );
      }
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

/**
 * Build localized URLs for all supported locales
 * Used for hreflang links and sitemap alternates
 */
export function buildLocaleUrls(siteUrl: string, path?: string): Record<string, string> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      path ? `${siteUrl}/${locale}${path}` : `${siteUrl}/${locale}`,
    ])
  );
}
