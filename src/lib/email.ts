import { ServerClient } from "postmark";

type EmailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

const emailConfig = {
  forceRealEmail: process.env.EMAIL_FORCE_REAL === "true",
  disableEmail: process.env.EMAIL_DISABLE === "true",
};

const postmarkClient =
  (process.env.NODE_ENV === "production" || emailConfig.forceRealEmail) &&
  !emailConfig.disableEmail &&
  process.env.POSTMARK_API_TOKEN
    ? new ServerClient(process.env.POSTMARK_API_TOKEN)
    : null;

export async function sendEmail(options: EmailOptions) {
  if (emailConfig.disableEmail) {
    console.log("📧 Email sending is disabled");
    return;
  }

  const { to, subject, html, text } = options;

  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (process.env.NODE_ENV === "development" && !emailConfig.forceRealEmail) {
    console.log("\n📧 Email would be sent:");
    console.log("To:", to);
    console.log("Subject:", subject);
    if (html) console.log("HTML:", html);
    if (text) console.log("Text:", text);
    console.log("---\n");
    return;
  }

  // Send real email using Postmark
  if (!postmarkClient) {
    if (process.env.NODE_ENV === "development") {
      // In development, fall back to console logging instead of failing
      console.log("\n📧 Email would be sent (Postmark not configured):");
      console.log("To:", to);
      console.log("Subject:", subject);
      if (html) console.log("HTML:", html);
      if (text) console.log("Text:", text);
      console.log("---\n");
      return;
    } else {
      // In production, fail fast with clear error message
      throw new Error(
        "Postmark client not initialized. Check your POSTMARK_API_TOKEN environment variable."
      );
    }
  }

  const fromEmail =
    process.env.POSTMARK_FROM_EMAIL || "noreply@mail.osmforcities.org";

  try {
    const result = await postmarkClient.sendEmail({
      From: `OSM for Cities <${fromEmail}>`,
      To: to,
      Subject: subject,
      HtmlBody: html || text || "",
      TextBody: text,
      MessageStream: "outbound",
      TrackOpens: false,
    });

    return result;
  } catch (error) {
    console.error("❌ Postmark email failed:", error);
    throw error;
  }
}
