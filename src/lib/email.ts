import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

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

const ses =
  (process.env.NODE_ENV === "production" || emailConfig.forceRealEmail) &&
  !emailConfig.disableEmail
    ? new SESClient({
        region: process.env.EMAIL_SES_REGION,
        credentials: {
          accessKeyId: process.env.EMAIL_SES_ACCESS_KEY_ID!,
          secretAccessKey: process.env.EMAIL_SES_SECRET_ACCESS_KEY!,
        },
      })
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

  // Send real email using SES
  if (!ses) {
    throw new Error(
      "SES client not initialized. Check your environment configuration."
    );
  }

  const params = {
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: html || text || "" },
        ...(text && { Text: { Charset: "UTF-8", Data: text } }),
      },
      Subject: { Charset: "UTF-8", Data: subject },
    },
    Source: `"OSM for Cities" <${process.env.EMAIL_SES_FROM_EMAIL!}>`,
  };

  const command = new SendEmailCommand(params);
  return ses.send(command);
}
