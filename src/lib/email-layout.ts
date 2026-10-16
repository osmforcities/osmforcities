import { htmlToText } from "html-to-text";
import { isRTL, type Locale } from "@/lib/email-i18n";

// Email clients ignore stylesheets, CSS variables and web fonts, so the app
// tokens are copied here as hex and every style is inline.
const COLOR = {
  olive50: "#f6faf5",
  olive500: "#57814c",
  blue500: "#0b4ad8",
  yellow100: "#fdf3d2",
  yellow700: "#745b08",
  text: "#222222",
  muted: "#666666",
};
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const PARAGRAPH = `margin: 0 0 24px; color: ${COLOR.text}; font-size: 16px; line-height: 150%;`;
const MUTED = `margin: 0 0 12px; color: ${COLOR.muted}; font-size: 14px; line-height: 150%;`;

/** Parts marked with this class are left out of the plain-text email. */
const HTML_ONLY = "html-only";

export function createEmailLink(url: string, text: string): string {
  return `<a href="${url}" style="color: ${COLOR.blue500}; text-decoration: none;">${text}</a>`;
}

export function emailButton(url: string, label: string): string {
  return `<p style="${PARAGRAPH}"><a href="${url}" style="display: inline-block; background-color: ${COLOR.olive500}; color: #ffffff; padding: 12px 48px; border-radius: 8px; font-weight: 600; text-decoration: none;">${label}</a></p>`;
}

export function emailParagraph(
  html: string,
  options: { muted?: boolean; htmlOnly?: boolean } = {}
): string {
  const htmlOnly = options.htmlOnly ? ` class="${HTML_ONLY}"` : "";
  return `<p${htmlOnly} style="${options.muted ? MUTED : PARAGRAPH}">${html}</p>`;
}

export function emailNotice(html: string): string {
  return `<p style="margin: 0 0 16px; padding: 8px 12px; border-radius: 8px; background-color: ${COLOR.yellow100}; color: ${COLOR.yellow700}; font-size: 14px; line-height: 150%;">${html}</p>`;
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
          <td lang="${locale}" dir="${dir}" style="padding: 32px; background-color: #ffffff; border-radius: 8px; font-family: ${FONT}; text-align: ${align};">
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
      { selector: `.${HTML_ONLY}`, format: "skip" },
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
    ],
  });
  return { html, text };
}
