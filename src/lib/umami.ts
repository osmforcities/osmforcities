import { logger } from "@/lib/logger";

/**
 * Fire-and-forget server-side event tracking via Umami.
 * No-ops if NEXT_PUBLIC_UMAMI_URL or NEXT_PUBLIC_UMAMI_WEBSITE_ID are unset.
 */
export function trackEvent(name: string, url: string) {
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!umamiUrl || !websiteId) return;

  fetch(`${umamiUrl}/api/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "osmforcities-server/1.0",
    },
    body: JSON.stringify({
      type: "event",
      payload: {
        website: websiteId,
        hostname: appUrl ? new URL(appUrl).hostname : "",
        url,
        name,
      },
    }),
  }).catch((err) => logger.warn("Umami event failed", { name, err }));
}
