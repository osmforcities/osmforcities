import { logger } from "@/lib/logger";

export interface UmamiEventOptions {
  userAgent?: string;
  ip?: string;
  language?: string;
  referrer?: string;
}

/**
 * Fire-and-forget server-side event tracking via Umami.
 * No-ops if NEXT_PUBLIC_UMAMI_URL or NEXT_PUBLIC_UMAMI_WEBSITE_ID are unset.
 */
export function trackEvent(
  name: string,
  url: string,
  options?: UmamiEventOptions
) {
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!umamiUrl || !websiteId) return;

  const payload = {
    type: "event",
    payload: {
      website: websiteId,
      hostname: appUrl ? new URL(appUrl).hostname : "",
      url,
      name,
      ...(options?.language ? { language: options.language } : {}),
      referrer: options?.referrer,
    },
  };

  logger.debug("Umami event", { name, payload });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": options?.userAgent || "osmforcities-server/1.0",
  };

  if (options?.ip) {
    headers["X-Forwarded-For"] = options.ip;
  }

  fetch(`${umamiUrl}/api/send`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({ status: res.status }));
      if (!res.ok) {
        logger.warn("Umami event failed", { name, status: res.status, data });
      } else {
        logger.debug("Umami event sent", { name, data });
      }
    })
    .catch((err) => logger.warn("Umami event error", { name, err }));
}
