/**
 * Email internationalization utilities.
 * Loads translation messages from JSON files for server-side email generation.
 */

import { promises as fs } from "fs";
import path from "path";

export type Locale = "en" | "pt-BR" | "es";

export interface EmailTranslations {
  magicLinkSubject: string;
  magicLinkBody: string;
  reportSubjectChanged: string;
  reportSubjectNoChanges: string;
  reportChanged: string;
  reportNoChanges: string;
  reportFollowed: string;
  day: string;
  week: string;
  generatedAt: string;
  unsubscribe: string;
  visitPreferences: string;
  datasetsOne: string;
  datasetsOther: string;
  changedLast: string;
}

const messageCache = new Map<Locale, Record<string, unknown>>();

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

function get<T>(
  messages: Record<string, unknown>,
  key: string,
  fallback?: T
): T | string {
  const keys = key.split(".");
  let current: unknown = messages;

  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return fallback ?? key;
    }
  }

  return typeof current === "string" ? current : fallback ?? key;
}

export async function getEmailTranslations(
  locale: Locale
): Promise<EmailTranslations> {
  const messages = await loadMessages(locale);
  const email = (messages.Email ??
    {}) as Record<string, unknown>;

  return {
    magicLinkSubject: get(email, "magicLinkSubject", "Sign in to OSM for Cities") as string,
    magicLinkBody: get(email, "magicLinkBody", "Click <link>here</link> to sign in.") as string,
    reportSubjectChanged: get(email, "reportSubjectChanged", "{count} {datasets, plural, =1 {dataset} other {datasets}} changed in the last {frequency}") as string,
    reportSubjectNoChanges: get(email, "reportSubjectNoChanges", "No changes in the last {frequency}") as string,
    reportChanged: get(email, "reportChanged", "The following {followed} were updated in the last {frequency}:") as string,
    reportNoChanges: get(email, "reportNoChanges", "There were no changes to your {followed} in the last {frequency}.") as string,
    reportFollowed: get(email, "reportFollowed", "<link>watched datasets</link>") as string,
    day: get(email, "day", "day") as string,
    week: get(email, "week", "week") as string,
    generatedAt: get(email, "generatedAt", "This report was generated at {timestamp}Z. All dates shown are in UTC.") as string,
    unsubscribe: get(email, "unsubscribe", "To unsubscribe from these reports, {action}.") as string,
    visitPreferences: get(email, "visitPreferences", "<link>visit your preferences page</link>") as string,
    datasetsOne: get(email, "datasetsOne", "dataset") as string,
    datasetsOther: get(email, "datasetsOther", "datasets") as string,
    changedLast: get(email, "changedLast", "{count, plural, =1 {# dataset} other {# datasets}} changed in the last {frequency}") as string,
  };
}

export interface LinkReplacement {
  placeholder: string;
  url: string;
  text: string;
}

/**
 * Replace HTML link tags in translated strings.
 * Converts <link>text</link> to <a href="url">text</a>
 */
export function replaceHtmlTags(
  html: string,
  replacements: LinkReplacement[]
): string {
  let result = html;

  for (const replacement of replacements) {
    const { placeholder, url, text } = replacement;
    const tag = `<link>${placeholder}</link>`;
    const anchorTag = `<a href="${url}" style="color: #007bff; text-decoration: none;">${text}</a>`;
    result = result.replace(tag, anchorTag);
  }

  return result;
}

/**
 * Format pluralized strings for email content.
 * Simple pluralization handler for server-side email generation.
 */
export function pluralize(
  count: number,
  one: string,
  other: string
): string {
  return count === 1 ? one : other;
}
