import { htmlToText } from "html-to-text";
import {
  createEmailLink,
  escapeHtml,
  getEmailT,
  isRTL,
  type Locale,
} from "@/lib/email-i18n";
import { MAGIC_LINK_TOKEN_TTL_HOURS } from "@/lib/magic-link-ttl";

// Email clients ignore stylesheets and web fonts: inline styles, system fonts,
// layout tables. Colors are the app's olive-50/500 and blue-500 tokens.
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const P = `margin: 0 0 24px; color: #222222; font-size: 16px; line-height: 150%;`;
const BUTTON =
  "display: inline-block; background-color: #57814c; color: #ffffff; padding: 12px 48px; border-radius: 8px; font-weight: 600; text-decoration: none;";

export async function buildMagicLinkEmail(locale: Locale, magicLink: string) {
  const t = await getEmailT(locale);
  const subject = t("magicLinkSubject");
  const href = escapeHtml(magicLink);
  const dir = isRTL(locale) ? "rtl" : "ltr";
  // Outlook ignores the logical `start` value.
  const align = dir === "rtl" ? "right" : "left";

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #f6faf5;">
  <tr>
    <td align="center" style="padding: 32px 16px 64px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; max-width: 600px;">
        <tr>
          <td lang="${locale}" dir="${dir}" style="padding: 32px; background-color: #ffffff; border-radius: 8px; font-family: ${FONT}; text-align: ${align};">
            <h1 style="margin: 0 0 24px; color: #222222; font-size: 22px; line-height: 130%;">${t("magicLinkHeading")}</h1>
            <p style="${P}"><a class="button" href="${href}" style="${BUTTON}">${t("magicLinkAction")}</a></p>
            <p style="${P}">${t("magicLinkExpiry", { hours: MAGIC_LINK_TOKEN_TTL_HOURS })}</p>
            <p style="${P} margin-bottom: 0; color: #666666; font-size: 14px;">${t("magicLinkFallback")}<br><span style="word-break: break-all;">${createEmailLink(href, href)}</span></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const text = htmlToText(html, {
    selectors: [
      { selector: "h1", options: { uppercase: false } },
      // The fallback line already prints the URL, so the button adds nothing.
      { selector: "a.button", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
    ],
  });
  return { subject, html, text };
}
