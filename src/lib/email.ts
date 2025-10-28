import { ServerClient } from "postmark";

type EmailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

const emailConfig = {
  disableEmail: process.env.EMAIL_DISABLE === "true",
};

const postmarkClient =
  !emailConfig.disableEmail && process.env.POSTMARK_API_TOKEN
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

  // Send real email using Postmark
  if (!postmarkClient) {
    throw new Error(
      "Postmark client not initialized. Check your POSTMARK_API_TOKEN environment variable."
    );
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
