import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";
import { getBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL("/", baseUrl));
}
