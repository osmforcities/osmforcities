import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, createVerificationToken } from "@/auth";
import { sendEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/utils";
import { formatEmail, type Locale } from "@/lib/email-i18n";

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

    const verificationToken = await createVerificationToken(email);

    const baseUrl = getBaseUrl(request);
    const magicLink = `${baseUrl}/api/auth/verify?token=${verificationToken.token}`;

    // Get user's language preference, default to 'en'
    const userLocale = (user.language || "en") as Locale;

    try {
      // Get translated email content with magic link
      const htmlBody = await formatEmail(userLocale, "magicLinkBody", {
        magicLink,
      });
      const subject = await formatEmail(userLocale, "magicLinkSubject", {});

      // Try to send email via Postmark (if configured)
      await sendEmail({
        to: email,
        subject,
        html: `<p>${htmlBody}</p>`,
        text: `Visit this link to sign in: ${magicLink}`,
      });
    } catch (error) {
      // If email sending fails (e.g., Postmark not configured), print magic link to console
      if (process.env.NODE_ENV === "development") {
        console.log("\n🔗 Magic Link Authentication");
        console.log("=".repeat(50));
        console.log("📧 Email:", email);
        console.log("🔗 Magic Link:", magicLink);
        console.log("💡 Click the link above to sign in");
        console.log("=".repeat(50));
        console.log("");
      } else {
        // In production, re-throw the error
        throw error;
      }
    }

    return NextResponse.json({
      message: "Magic link sent successfully",
      // Include magic link in development for easier testing
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
