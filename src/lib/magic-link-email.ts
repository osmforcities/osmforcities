import { escapeHtml, getEmailT, type Locale } from "@/lib/email-i18n";
import { emailButton, emailParagraph, emailUrl, renderEmail } from "@/lib/email-layout";
import { MAGIC_LINK_TOKEN_TTL_HOURS } from "@/lib/magic-link-ttl";

export async function buildMagicLinkEmail(locale: Locale, magicLink: string) {
  const t = await getEmailT(locale);
  const href = escapeHtml(magicLink);

  const { html, text } = renderEmail({
    locale,
    heading: t("magicLinkHeading"),
    body: [
      emailButton(href, t("magicLinkAction")),
      emailParagraph(t("magicLinkExpiry", { hours: MAGIC_LINK_TOKEN_TTL_HOURS })),
      // Plain text already prints the URL next to the button.
      emailParagraph(`${t("magicLinkFallback")}<br>${emailUrl(href)}`, {
        muted: true,
        htmlOnly: true,
      }),
    ].join(""),
  });
  return { subject: t("magicLinkSubject"), html, text };
}
