import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  createUser,
  createVerificationToken,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser(email);
    }

    const verificationToken = await createVerificationToken(email, user.id);

    const magicLink = `${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/api/auth/verify?token=${verificationToken.token}`;

    console.log("Magic link for", email, ":", magicLink);

    return NextResponse.json({
      message: "Magic link sent successfully",
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === "development" && { magicLink }),
    });
  } catch (error) {
    console.error("Error sending magic link:", error);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}
