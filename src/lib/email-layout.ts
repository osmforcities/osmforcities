import { htmlToText } from "html-to-text";
import { getEmailBaseUrl, isRTL, type getEmailT, type Locale } from "@/lib/email-i18n";

type EmailTranslator = Awaited<ReturnType<typeof getEmailT>>;

// Email clients ignore stylesheets, CSS variables and web fonts, so the app
// tokens are copied here as hex and every style is inline.
export const COLOR = {
  olive50: "#f6faf5",
  olive100: "#edf6eb",
  olive500: "#57814c",
  olive600: "#3f5c39",
  yellow100: "#fdf3d2",
  yellow700: "#745b08",
  text: "#222222",
  muted: "#666666",
  white: "#ffffff",
};
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const PARAGRAPH = `margin: 0 0 24px; color: ${COLOR.text}; font-size: 16px; line-height: 150%;`;
const MUTED = `margin: 0 0 12px; color: ${COLOR.muted}; font-size: 14px; line-height: 150%;`;

const SKIP_IN_PLAIN_TEXT = "html-only";

export function createEmailLink(url: string, text: string): string {
  return `<a href="${url}" style="color: ${COLOR.olive600}; text-decoration: underline;">${text}</a>`;
}

export function emailButton(url: string, label: string): string {
  return `<p style="${PARAGRAPH}"><a href="${url}" style="display: inline-block; background-color: ${COLOR.olive500}; color: ${COLOR.white}; padding: 12px 48px; border-radius: 8px; font-weight: 600; text-decoration: none;">${label}</a></p>`;
}

export function emailParagraph(
  html: string,
  options: { muted?: boolean; skipInPlainText?: boolean } = {}
): string {
  const skipClass = options.skipInPlainText ? ` class="${SKIP_IN_PLAIN_TEXT}"` : "";
  return `<p${skipClass} style="${options.muted ? MUTED : PARAGRAPH}">${html}</p>`;
}

function emailNotice(html: string): string {
  return `<p style="margin: 12px 0 0; padding: 8px 12px; border-radius: 8px; background-color: ${COLOR.yellow100}; color: ${COLOR.yellow700}; font-size: 14px; line-height: 150%;">${html}</p>`;
}

export function emailList(rows: string[]): string {
  const cells = rows
    .map((row, i) => {
      const divider = i > 0 ? ` border-top: 1px solid ${COLOR.olive100};` : "";
      return `<tr><td style="padding: 16px;${divider}">${row}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: separate; border: 1px solid ${COLOR.olive100}; border-radius: 8px; margin: 0 0 24px;">${cells}</table>`;
}

/**
 * One list row: icon tile, dark title and an outlined action button, all
 * opening `url`. Icon and action are HTML-only so plain text prints the URL
 * once, after the title.
 */
export function emailListItem({
  url,
  iconUrl,
  title,
  subtitle,
  meta,
  action,
  notice,
}: {
  url: string;
  iconUrl: string;
  title: string;
  subtitle: string;
  meta: string;
  action: string;
  notice?: string;
}): string {
  const titleLink = `<a href="${url}" style="color: ${COLOR.text}; text-decoration: none;"><strong>${title}</strong></a>`;
  const actionButton = `<a href="${url}" style="display: inline-block; padding: 6px 14px; border: 1px solid ${COLOR.olive500}; border-radius: 6px; color: ${COLOR.olive600}; font-size: 14px; font-weight: 600; line-height: 150%; text-decoration: none;">${action}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
  <tr>
    <td class="${SKIP_IN_PLAIN_TEXT}" valign="top" width="40" style="padding: 0 12px 0 0;"><a href="${url}"><img src="${iconUrl}" width="40" height="40" alt="" style="display: block; border: 0; border-radius: 8px;"></a></td>
    <td valign="top" style="font-size: 16px; line-height: 150%;">${titleLink}<br><span style="color: ${COLOR.muted};">${subtitle}</span><br><span style="color: ${COLOR.muted}; font-size: 14px;">${meta}</span></td>
    <td class="${SKIP_IN_PLAIN_TEXT}" valign="top" width="1" style="padding: 0 0 0 12px; white-space: nowrap;">${actionButton}</td>
  </tr>
</table>${notice ? emailNotice(notice) : ""}`;
}

export function emailPreferencesLine(t: EmailTranslator, locale: Locale): string {
  const url = `${getEmailBaseUrl()}/${locale}/preferences`;
  return t("unsubscribe", { preferencesLink: createEmailLink(url, t("preferencesPage")) });
}

/** URLs break anywhere so a long link never widens the card on phones. */
export function emailUrl(url: string): string {
  return `<span style="word-break: break-all;">${createEmailLink(url, url)}</span>`;
}

/**
 * Wraps body HTML in the shared card and derives the plain-text part.
 * Callers escape interpolated user or OSM data before passing it in.
 */
export function renderEmail({
  locale,
  heading,
  body,
  footer = [],
}: {
  locale: Locale;
  heading: string;
  body: string;
  footer?: string[];
}): { html: string; text: string } {
  const dir = isRTL(locale) ? "rtl" : "ltr";
  // Outlook ignores the logical `start` value.
  const align = dir === "rtl" ? "right" : "left";
  const footerHtml = footer.map((line) => emailParagraph(line, { muted: true })).join("");

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: ${COLOR.olive50};">
  <tr>
    <td align="center" style="padding: 32px 16px 64px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; max-width: 600px;">
        <tr>
          <td lang="${locale}" dir="${dir}" style="padding: 32px; background-color: ${COLOR.white}; border-radius: 8px; font-family: ${FONT}; text-align: ${align};">
            <h1 style="margin: 0 0 24px; color: ${COLOR.text}; font-size: 22px; line-height: 130%;">${heading}</h1>
            ${body}
            ${footerHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const text = htmlToText(html, {
    selectors: [
      { selector: "h1", options: { uppercase: false } },
      { selector: `.${SKIP_IN_PLAIN_TEXT}`, format: "skip" },
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
    ],
  });
  return { html, text };
}
