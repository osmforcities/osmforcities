/**
 * Email internationalization utilities.
 * Uses use-intl/core createTranslator for ICU MessageFormat support.
 */

import { promises as fs } from "fs";
import path from "path";
import { createTranslator } from "use-intl/core";

/** Supported locales for emails. */
export type Locale = "en" | "pt-BR" | "es";

/** Shared HTML style for email links. */
export const EMAIL_LINK_STYLE = 'style="color: #007bff; text-decoration: none;"';

/** Creates an HTML link with consistent styling. */
export function createEmailLink(url: string, text: string): string {
  return `<a href="${url}" ${EMAIL_LINK_STYLE}>${text}</a>`;
}

const RTL_LOCALES = ["ar", "he", "fa", "ur"];

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}

const messageCache = new Map<Locale, Record<string, unknown>>();

export function clearMessageCache(): void {
  messageCache.clear();
}

async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  if (messageCache.has(locale)) {
    return messageCache.get(locale)!;
  }

  const filePath = path.join(process.cwd(), "messages", `${locale}.json`);
  const content = await fs.readFile(filePath, "utf-8");
  const messages = JSON.parse(content) as Record<string, unknown>;
  messageCache.set(locale, messages);
  return messages;
}

/** Returns a translator scoped to the Email namespace for a locale. */
export async function getEmailT(locale: Locale) {
  const allMessages = await loadMessages(locale);
  const messages = (allMessages as Record<string, unknown>).Email as Record<string, string>;
  return createTranslator({ locale, messages });
}

/** Loads translation and interpolates values for a locale. */
export async function formatEmail(
  locale: Locale,
  key: string,
  values: Record<string, string | number | Date> = {}
): Promise<string> {
  const t = await getEmailT(locale);
  return t(key as Parameters<typeof t>[0], values);
}

/**
 * Formats translation with HTML markup support.
 * Pass transform functions for HTML placeholders, primitive values for text.
 * Example: formatEmailMarkup('en', 'key', { link: (c) => `<a>${c}</a>`, count: 5 })
 */
export async function formatEmailMarkup(
  locale: Locale,
  key: string,
  values: Record<string, ((chunks: string) => string) | string | number | Date>
): Promise<string> {
  const t = await getEmailT(locale);
  return t.markup(key as Parameters<typeof t.markup>[0], values);
}
