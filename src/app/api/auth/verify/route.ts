import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createSession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/?error=invalid-token", request.url)
      );
    }

    const verificationResult = await verifyToken(token);

    if (!verificationResult || !verificationResult.user) {
      return NextResponse.redirect(
        new URL("/?error=invalid-or-expired-token", request.url)
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

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Error verifying token:", error);
    return NextResponse.redirect(
      new URL("/?error=verification-failed", request.url)
    );
  }
}
