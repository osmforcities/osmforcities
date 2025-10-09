import { ServerClient } from "postmark";

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

/**
 * Test function for sending magic link via Postmark
 */
export async function sendPostmarkEmail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  console.log("🔍 DEBUG: sendPostmarkEmail called");
  console.log("📧 Email config:", emailConfig);
  console.log("🌍 NODE_ENV:", process.env.NODE_ENV);
  console.log(
    "🔑 POSTMARK_API_TOKEN present:",
    !!process.env.POSTMARK_API_TOKEN
  );

  if (emailConfig.disableEmail) {
    console.log("📧 Email sending is disabled");
    return;
  }

  if (process.env.NODE_ENV === "test") {
    console.log("📧 Test environment, skipping email");
    return;
  }

  if (process.env.NODE_ENV === "development" && !emailConfig.forceRealEmail) {
    console.log("\n📧 Postmark email would be sent:");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("HTML:", html);
    console.log("Text:", text);
    console.log("---\n");
    return;
  }

  if (!postmarkClient) {
    throw new Error(
      "Postmark client not initialized. Check your POSTMARK_API_TOKEN environment variable."
    );
  }

  const fromEmail =
    process.env.POSTMARK_FROM_EMAIL || "noreply@mail.osmforcities.org";

  console.log("📧 About to send via Postmark:");
  console.log("From:", fromEmail);
  console.log("To:", to);
  console.log("Subject:", subject);

  try {
    const result = await postmarkClient.sendEmail({
      From: `OSM for Cities <${fromEmail}>`,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: "outbound",
      TrackOpens: false,
      TrackLinks: "None",
    });

    console.log("✅ Postmark email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Postmark email failed:", error);
    throw error;
  }
}
