import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  createUser,
  createVerificationToken,
} from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/utils";

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

    const baseUrl = getBaseUrl(request);
    const magicLink = `${baseUrl}/api/auth/verify?token=${verificationToken.token}`;

    await sendEmail({
      to: email,
      subject: "Your Magic Link",
      html: `<p>Click <a href=\"${magicLink}\">here</a> to sign in.</p>`,
      text: `Visit this link to sign in: ${magicLink}`,
    });

    return NextResponse.json({
      message: "Magic link sent successfully",
      // Only include magic link in development for easier testing
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
