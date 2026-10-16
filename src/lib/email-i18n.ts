/**
 * Email internationalization utilities.
 * Uses use-intl/core createTranslator for ICU MessageFormat support.
 */

import { promises as fs } from "fs";
import path from "path";
import { createTranslator } from "use-intl/core";
import type { AvailableLocale } from "@/i18n/constants";

/** Supported locales for emails. */
export type Locale = AvailableLocale;

export function getEmailBaseUrl(): string {
  return process.env.AUTH_URL || "https://osmforcities.com";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/**
 * Returns a translator scoped to the Email namespace for a locale.
 * use-intl/core does not HTML-escape values in string mode, so callers escape
 * data themselves and can pass links as values (tested).
 */
export async function getEmailT(locale: Locale) {
  const allMessages = await loadMessages(locale);
  const messages = (allMessages as Record<string, unknown>).Email as Record<string, string>;
  return createTranslator({ locale, messages });
}

