import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

export interface UmamiEventOptions {
  userAgent?: string;
  ip?: string;
  language?: string;
  referrer?: string;
}

type ClientInfo = Pick<UmamiEventOptions, "ip" | "userAgent" | "language" | "referrer">;

export function getClientInfo(request: NextRequest): ClientInfo {
  const acceptLanguage = request.headers.get("accept-language");
  const language = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim();

  return {
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
    language: language || undefined,
    referrer: request.headers.get("referer") || undefined,
  };
}

export async function getClientInfoFromHeaders(): Promise<ClientInfo> {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const language = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim();

  return {
    ip: headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined,
    userAgent: headersList.get("user-agent") || undefined,
    language: language || undefined,
    referrer: headersList.get("referer") || undefined,
  };
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
      ...(options?.referrer ? { referrer: options.referrer } : {}),
    },
  };

  logger.debug("Umami event", { name, payload });

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": options?.userAgent || "osmforcities-server/1.0",
  };

  if (options?.ip) {
    requestHeaders["X-Forwarded-For"] = options.ip;
  }

  fetch(`${umamiUrl}/api/send`, {
    method: "POST",
    headers: requestHeaders,
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
