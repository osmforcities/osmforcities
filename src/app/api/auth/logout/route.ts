import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";
import { getBaseUrl } from "@/lib/utils";
import { trackEventAfterRequest } from "@/lib/umami";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  trackEventAfterRequest(ANALYTICS_EVENTS.SIGN_OUT, "/sign-out", request);
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL("/", baseUrl));
}
