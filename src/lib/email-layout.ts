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
  yellow500: "#ffbf0f",
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

export interface EmailStat {
  iconUrl: string;
  text: string;
}

export interface EmailWarning {
  iconUrl: string;
  title: string;
  body: string;
}

function emailWarning({ iconUrl, title, body }: EmailWarning): string {
  return `<div style="margin: 12px 0 0; padding: 10px 12px; border-left: 4px solid ${COLOR.yellow500}; border-radius: 4px; background-color: ${COLOR.yellow100}; color: ${COLOR.yellow700}; font-size: 14px; line-height: 150%;"><img src="${iconUrl}" width="16" height="16" alt="" style="vertical-align: -3px; margin: 0 6px 0 0; border: 0;"><strong>${title}</strong><br>${body}</div>`;
}

/**
 * Each stat stays on one line; whole stats wrap to the next line on narrow
 * screens. The plain space between them is the wrap point and the text-part gap.
 */
function emailStats(stats: EmailStat[]): string {
  return stats
    .map(
      ({ iconUrl, text }) =>
        `<span style="display: inline-block; white-space: nowrap; margin: 0 12px 0 0;"><img src="${iconUrl}" width="14" height="14" alt="" style="vertical-align: -2px; margin: 0 4px 0 0; border: 0;">${text}</span>`
    )
    .join(" ");
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
 * One list row: icon tile, dark title, stats and an outlined action button.
 * With a `link`, title, tile and action all open it; tile and action are
 * HTML-only so plain text prints the URL once, after the title. Without one
 * (a page that no longer exists) the row is plain text with no action.
 */
export function emailListItem({
  link,
  iconUrl,
  title,
  subtitle,
  stats,
  warning,
}: {
  link?: { url: string; action: string };
  iconUrl: string;
  title: string;
  subtitle: string;
  stats: EmailStat[];
  warning?: EmailWarning;
}): string {
  const linked = (html: string, style = "") =>
    link ? `<a href="${link.url}" style="text-decoration: none;${style}">${html}</a>` : html;
  const tile = `<img src="${iconUrl}" width="40" height="40" alt="" style="display: block; border: 0; border-radius: 8px;">`;
  const actionCell = link
    ? `<td class="${SKIP_IN_PLAIN_TEXT}" valign="top" width="1" style="padding: 0 0 0 12px; white-space: nowrap;"><a href="${link.url}" style="display: inline-block; padding: 6px 14px; border: 1px solid ${COLOR.olive500}; border-radius: 6px; color: ${COLOR.olive600}; font-size: 14px; font-weight: 600; line-height: 150%; text-decoration: none;">${link.action}</a></td>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
  <tr>
    <td class="${SKIP_IN_PLAIN_TEXT}" valign="top" width="40" style="padding: 0 12px 0 0;">${linked(tile)}</td>
    <td valign="top" style="font-size: 16px; line-height: 150%; color: ${COLOR.text};">${linked(`<strong>${title}</strong>`, ` color: ${COLOR.text};`)}<br><span style="color: ${COLOR.muted};">${subtitle}</span><br><span style="color: ${COLOR.muted}; font-size: 14px;">${emailStats(stats)}</span></td>
    ${actionCell}
  </tr>
</table>${warning ? emailWarning(warning) : ""}`;
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
      { selector: "img", format: "skip" },
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
    ],
  });
  return { html, text };
}
