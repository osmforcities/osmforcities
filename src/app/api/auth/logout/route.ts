import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";
import { getBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    await signOut({ redirectTo: "/" });
    return NextResponse.redirect(new URL("/", baseUrl));
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
