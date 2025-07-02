import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/?error=invalid-token", baseUrl));
    }

    const verificationResult = await verifyToken(token);

    if (!verificationResult || !verificationResult.user) {
      return NextResponse.redirect(
        new URL("/?error=invalid-or-expired-token", baseUrl)
      );
    }

    const session = await createSession(verificationResult.user.id);

    const cookieStore = await cookies();
    cookieStore.set("session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    const redirectUrl = new URL("/", baseUrl);
    return NextResponse.redirect(redirectUrl);
  } catch {
    // Use baseUrl for error redirect as well
    return NextResponse.redirect(
      new URL("/?error=verification-failed", baseUrl)
    );
  }
}
