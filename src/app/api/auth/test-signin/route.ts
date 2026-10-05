import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser } from "@/auth";
import { isTestAuthEnabled } from "@/lib/test-auth";
import { EmailSchema } from "@/schemas/auth";

export async function POST(request: NextRequest) {
  if (!isTestAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { email } = await request.json();

    if (!EmailSchema.safeParse(email).success) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser(email);
    }

    const testSession = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        language: user.language || "en",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const sessionToken = Buffer.from(JSON.stringify(testSession)).toString(
      "base64"
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    response.cookies.set("test-auth-session", sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Error in test sign-in:", error);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
