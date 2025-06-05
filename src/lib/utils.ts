import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Returns the base URL for API route redirects
export function getBaseUrl(request: { url: string }): string {
  if (process.env.NODE_ENV === "production" && process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  const url = new URL(request.url);
  return url.origin;
}
