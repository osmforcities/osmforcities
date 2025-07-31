import { getRequestConfig } from "next-intl/server";
import { hasLocale, Formats } from "next-intl";
import { routing } from "./routing";

export const formats = {
  dateTime: {
    short: {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
    long: {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  },
  number: {
    precise: {
      maximumFractionDigits: 2,
    },
  },
  list: {
    enumeration: {
      style: "long",
      type: "conjunction",
    },
  },
} satisfies Formats;

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    formats,
  };
});
