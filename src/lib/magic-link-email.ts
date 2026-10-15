import { htmlToText } from "html-to-text";
import {
  createEmailLink,
  escapeHtml,
  getEmailT,
  isRTL,
  type Locale,
} from "@/lib/email-i18n";
import { MAGIC_LINK_TOKEN_TTL_HOURS } from "@/lib/magic-link-ttl";

export async function buildMagicLinkEmail(locale: Locale, magicLink: string) {
  const t = await getEmailT(locale);
  const subject = t("magicLinkSubject");
  const href = escapeHtml(magicLink);
  const dir = isRTL(locale) ? "rtl" : "ltr";

  const html = `<div lang="${locale}" dir="${dir}">
  <h1 style="font-size: 20px;">${subject}</h1>
  <p style="font-size: 18px; font-weight: bold;">${createEmailLink(href, t("magicLinkAction"))}</p>
  <p>${t("magicLinkFallback")}<br>${href}</p>
  <p style="color: #666; font-size: 14px;">${t("magicLinkExpiry", { hours: MAGIC_LINK_TOKEN_TTL_HOURS })}</p>
</div>`;

  const text = htmlToText(html, {
    selectors: [
      { selector: "h1", options: { uppercase: false } },
      // The raw URL already follows as the fallback line.
      { selector: "a", options: { ignoreHref: true } },
    ],
  });
  return { subject, html, text };
}
