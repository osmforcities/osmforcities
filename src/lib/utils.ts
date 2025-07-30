import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { bbox } from "@turf/bbox";
import type { FeatureCollection } from "geojson";
import { BboxSchema, type Bbox } from "@/types/geojson";

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
