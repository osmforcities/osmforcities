import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, createVerificationToken } from "@/auth";
import { sendEmail } from "@/lib/email";
import { isMagicLinkRateLimited } from "@/lib/magic-link-rate-limit";
import { LAST_EMAIL_COOKIE, LAST_EMAIL_MAX_AGE } from "@/lib/last-email-cookie";
import { getBaseUrl } from "@/lib/utils";
import { formatEmail, createEmailLink, type Locale } from "@/lib/email-i18n";
import { EmailSchema } from "@/schemas/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = EmailSchema.safeParse(body?.email);
    // Opt-in only: a persistent convenience cookie needs the user's consent.
    const remember = body?.remember === true;

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const email = parsed.data;

    if (await isMagicLinkRateLimited(email)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
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
        magicLink: createEmailLink(magicLink, "link"),
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

    const response = NextResponse.json({
      message: "Magic link sent successfully",
    });
    if (remember) {
      response.cookies.set(LAST_EMAIL_COOKIE, email, {
        maxAge: LAST_EMAIL_MAX_AGE,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    } else {
      response.cookies.delete(LAST_EMAIL_COOKIE);
    }
    return response;
  } catch (error) {
    console.error("Error sending magic link:", error);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}
