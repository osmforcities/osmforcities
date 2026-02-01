/**
 * Email internationalization utilities.
 * Uses {placeholder} syntax for dynamic values and HTML links.
 */

import { promises as fs } from "fs";
import path from "path";

/** Supported locales for emails. */
export type Locale = "en" | "pt-BR" | "es";

/** Email template strings with {placeholder} marks for dynamic values. */
export interface EmailTranslations {
  magicLinkSubject: string;
  magicLinkBody: string;
  reportSubjectChanged: string;
  reportSubjectNoChanges: string;
  reportChanged: string;
  reportNoChanges: string;
  reportFollowed: string;
  preferencesPage: string;
  day: string;
  week: string;
  generatedAt: string;
  unsubscribe: string;
  datasetsOne: string;
  datasetsOther: string;
}

/** Dynamic values to interpolate into email templates. */
export interface EmailValues {
  magicLink?: string;
  watchedDatasetsUrl?: string;
  watchedDatasetsText?: string;
  preferencesUrl?: string;
  preferencesText?: string;
  count?: number;
  frequency?: string;
  timestamp?: string;
  datasetsOne?: string;
  datasetsOther?: string;
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

/** Loads email translations for a locale from messages/{locale}.json. */
export async function getEmailTranslations(
  locale: Locale
): Promise<EmailTranslations> {
  const messages = await loadMessages(locale);
  const email = (messages.Email ??
    {}) as Record<string, unknown>;

  return {
    magicLinkSubject: get(email, "magicLinkSubject", "Sign in to OSM for Cities") as string,
    magicLinkBody: get(email, "magicLinkBody", "Click {magicLink} to sign in.") as string,
    reportSubjectChanged: get(email, "reportSubjectChanged", "{count} {datasets, plural, =1 {dataset} other {datasets}} changed in the last {frequency}") as string,
    reportSubjectNoChanges: get(email, "reportSubjectNoChanges", "No changes in the last {frequency}") as string,
    reportChanged: get(email, "reportChanged", "The following datasets were updated in the last {frequency}:") as string,
    reportNoChanges: get(email, "reportNoChanges", "There were no changes to your {watchedDatasetsUrl} in the last {frequency}.") as string,
    reportFollowed: get(email, "reportFollowed", "watched datasets") as string,
    preferencesPage: get(email, "preferencesPage", "preferences page") as string,
    day: get(email, "day", "day") as string,
    week: get(email, "week", "week") as string,
    generatedAt: get(email, "generatedAt", "This report was generated at {timestamp}Z. All dates shown are in UTC.") as string,
    unsubscribe: get(email, "unsubscribe", "To unsubscribe from these reports, visit {preferencesUrl}.") as string,
    datasetsOne: get(email, "datasetsOne", "dataset") as string,
    datasetsOther: get(email, "datasetsOther", "datasets") as string,
  };
}

/** Replaces {placeholders} with HTML links or text values. */
export function interpolateEmail(
  template: string,
  values: EmailValues & { datasets?: string }
): string {
  let result = template;

  // Replace magic link
  if (values.magicLink) {
    result = result.replace(
      "{magicLink}",
      `<a href="${values.magicLink}" style="color: #007bff; text-decoration: none;">link</a>`
    );
  }

  // Replace watched datasets link with URL and text from values
  if (values.watchedDatasetsUrl) {
    const text = values.watchedDatasetsText || "watched datasets";
    result = result.replace(
      "{watchedDatasetsLink}",
      `<a href="${values.watchedDatasetsUrl}" style="color: #007bff; text-decoration: none;">${text}</a>`
    );
  }

  // Replace preferences link with URL and text from values
  if (values.preferencesUrl) {
    const text = values.preferencesText || "preferences page";
    result = result.replace(
      "{preferencesLink}",
      `<a href="${values.preferencesUrl}" style="color: #007bff; text-decoration: none;">${text}</a>`
    );
  }

  // Replace simple placeholders
  if (values.count !== undefined && values.datasetsOne && values.datasetsOther) {
    const word = values.count === 1 ? values.datasetsOne : values.datasetsOther;
    result = result.replace("{count}", values.count.toString());
    result = result.replace("{datasets}", word);
  }
  if (values.frequency) {
    result = result.replace(/{frequency}/g, values.frequency);
  }
  if (values.timestamp) {
    result = result.replace("{timestamp}", values.timestamp);
  }

  return result;
}

/** Loads translation and interpolates values for a locale. */
export async function formatEmail(
  locale: Locale,
  key: keyof EmailTranslations,
  values: EmailValues & { datasets?: string }
): Promise<string> {
  const translations = await getEmailTranslations(locale);
  const template = translations[key];
  return interpolateEmail(template, values);
}
