import { ServerClient } from "postmark";
import { createLogger } from "@/lib/logger";

const log = createLogger("email");

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
    log.debug("Email sending is disabled", { to: options.to });
    return;
  }

  const { to, subject, html, text } = options;

  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (!postmarkClient) {
    log.error("Postmark client not initialized", { to });
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

    log.info("Email sent via Postmark", { to, subject, messageId: result.MessageID });
    return result;
  } catch (error) {
    log.error("Postmark email failed", {
      to,
      subject,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
