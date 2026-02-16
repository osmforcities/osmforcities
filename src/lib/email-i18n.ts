/**
 * Email internationalization utilities.
 * Uses {placeholder} syntax for dynamic values and HTML links.
 */

import { promises as fs } from "fs";
import path from "path";

/** Supported locales for emails. */
export type Locale = "en" | "pt-BR" | "es";

/** Shared HTML style for email links. */
export const EMAIL_LINK_STYLE = 'style="color: #007bff; text-decoration: none;"';

/** Creates an HTML link with consistent styling. */
export function createEmailLink(url: string, text: string): string {
  return `<a href="${url}" ${EMAIL_LINK_STYLE}>${text}</a>`;
}

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
  lastPeriodDay: string;
  lastPeriodWeek: string;
  generatedAt: string;
  unsubscribe: string;
  datasetsOne: string;
  datasetsOther: string;
  templateDeprecated: string;
  templateDeprecatedDaysRemaining: string;
  greeting: string;
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
  lastPeriod?: string;
  timestamp?: string;
  datasetsOne?: string;
  datasetsOther?: string;
  days?: number;
  greeting?: string;
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
    reportSubjectChanged: get(email, "reportSubjectChanged", "{count} {datasets, plural, =1 {dataset} other {datasets}} changed {lastPeriod}") as string,
    reportSubjectNoChanges: get(email, "reportSubjectNoChanges", "No changes {lastPeriod}") as string,
    reportChanged: get(email, "reportChanged", "The following datasets were updated {lastPeriod}:") as string,
    reportNoChanges: get(email, "reportNoChanges", "There were no changes to your {watchedDatasetsUrl} {lastPeriod}.") as string,
    reportFollowed: get(email, "reportFollowed", "watched datasets") as string,
    preferencesPage: get(email, "preferencesPage", "preferences page") as string,
    lastPeriodDay: get(email, "lastPeriodDay", "in the last day") as string,
    lastPeriodWeek: get(email, "lastPeriodWeek", "in the last week") as string,
    generatedAt: get(email, "generatedAt", "This report was generated at {timestamp}Z. All dates shown are in UTC.") as string,
    unsubscribe: get(email, "unsubscribe", "To unsubscribe from these reports, visit {preferencesUrl}.") as string,
    datasetsOne: get(email, "datasetsOne", "dataset") as string,
    datasetsOther: get(email, "datasetsOther", "datasets") as string,
    templateDeprecated: get(email, "templateDeprecated", "This template was removed from the catalog.") as string,
    templateDeprecatedDaysRemaining: get(email, "templateDeprecatedDaysRemaining", "You have {days} day{days, plural, =1 {} other {s}} remaining before this dataset is deleted.") as string,
    greeting: get(email, "greeting", "Hi!") as string,
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
    result = result.replace("{magicLink}", createEmailLink(values.magicLink, "link"));
  }

  // Replace watched datasets link with URL and text from values
  if (values.watchedDatasetsUrl) {
    const text = values.watchedDatasetsText || "watched datasets";
    result = result.replace("{watchedDatasetsLink}", createEmailLink(values.watchedDatasetsUrl, text));
  }

  // Replace preferences link with URL and text from values
  if (values.preferencesUrl) {
    const text = values.preferencesText || "preferences page";
    result = result.replace("{preferencesLink}", createEmailLink(values.preferencesUrl, text));
  }

  // Replace greeting
  if (values.greeting !== undefined) {
    result = result.replace("{greeting}", values.greeting);
  }

  // Replace simple placeholders
  if (values.count !== undefined && values.datasetsOne && values.datasetsOther) {
    const word = values.count === 1 ? values.datasetsOne : values.datasetsOther;
    result = result.replace("{count}", values.count.toString());
    result = result.replace("{datasets}", word);
    // Handle ICU plural format for datasets: {datasets, plural, =1 {...} other {...}}
    result = result.replace(/\{datasets, plural, =1 \{[^}]*\} other \{[^}]*\}\}/g, word);
  }
  if (values.frequency) {
    result = result.replace(/{frequency}/g, values.frequency);
  }
  if (values.lastPeriod) {
    result = result.replace(/{lastPeriod}/g, values.lastPeriod);
  }
  if (values.timestamp) {
    result = result.replace("{timestamp}", values.timestamp);
  }
  if (values.days !== undefined) {
    const days = values.days.toString();
    result = result.replace(/\{days\}/g, days);
    // Handle ICU plural format for days: {days, plural, =1 {} other {s}}
    result = result.replace(/\{days, plural, =1 \{\} other \{s\}\}/g, values.days === 1 ? "" : "s");
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
