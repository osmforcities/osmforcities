import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signIn } from "@/auth";
import { getBaseUrl } from "@/lib/utils";
import { prisma } from "@/lib/db";

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

    await prisma.user.update({
      where: { id: verificationResult.user.id },
      data: { emailVerified: new Date() },
    });

    await signIn("magic-link", {
      userId: verificationResult.user.id,
      redirect: false,
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
