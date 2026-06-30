import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";
import { getBaseUrl } from "@/lib/utils";
import { trackEvent, getClientInfo } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  await trackEvent(ANALYTICS_EVENTS.SIGN_OUT, "/sign-out", getClientInfo(request));
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL("/", baseUrl));
}
