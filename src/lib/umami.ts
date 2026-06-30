import { headers } from "next/headers";
import { NextRequest, after } from "next/server";
import { logger } from "@/lib/logger";

export type ClientInfo = {
  ip?: string;
  userAgent?: string;
  language?: string;
  referrer?: string;
};

export function getClientInfo(request: NextRequest): ClientInfo {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent: request.headers.get("user-agent") || undefined,
    language:
      request.headers
        .get("accept-language")
        ?.split(",")[0]
        .split(";")[0]
        .trim() || undefined,
    referrer: request.headers.get("referer") || undefined,
  };
}

export async function getClientInfoFromHeaders(): Promise<ClientInfo> {
  const h = await headers();
  return {
    ip:
      h.get("x-forwarded-for")?.split(",")[0].trim() ||
      h.get("x-real-ip") ||
      undefined,
    userAgent: h.get("user-agent") || undefined,
    language:
      h.get("accept-language")?.split(",")[0].split(";")[0].trim() ||
      undefined,
    referrer: h.get("referer") || undefined,
  };
}

// Best-effort, bounded by a 5s timeout, and never rejects: failures are logged
// so tracking can never break a user flow. Await it only where the response can
// wait; for user-facing routes/pages prefer `trackEventAfterResponse` (or wrap
// in `after()`) so analytics never delays the response.
export async function trackEvent(
  eventName: string,
  url: string,
  clientInfo?: ClientInfo,
): Promise<void> {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;

  if (!websiteId || !umamiUrl) return;

  const fetchHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (clientInfo?.ip) fetchHeaders["x-forwarded-for"] = clientInfo.ip;
  if (clientInfo?.userAgent) fetchHeaders["user-agent"] = clientInfo.userAgent;

  try {
    const res = await fetch(`${umamiUrl}/api/send`, {
      method: "POST",
      headers: fetchHeaders,
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        type: "event",
        payload: {
          website: websiteId,
          url,
          name: eventName,
          hostname: process.env.NEXT_PUBLIC_APP_URL
            ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
            : "",
          language: clientInfo?.language ?? "",
          referrer: clientInfo?.referrer ?? "",
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ status: res.status }));
      logger.warn("Umami event failed", { event: eventName, status: res.status, data });
    } else {
      logger.info("Umami event sent", { event: eventName, url });
    }
  } catch (err) {
    logger.warn("Umami event error", { event: eventName, err });
  }
}

// Fire-and-forget tracking for server components/pages: captures request client
// info during render, then schedules the event to run after the response is sent
// so analytics never blocks the render. De-duplicates the capture+after+track
// pattern repeated across pages.
export async function trackEventAfterResponse(
  eventName: string,
  url: string,
): Promise<void> {
  const clientInfo = await getClientInfoFromHeaders();
  after(() => trackEvent(eventName, url, clientInfo));
}
