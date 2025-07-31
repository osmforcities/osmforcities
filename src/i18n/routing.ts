import { defineRouting } from "next-intl/routing";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE } from "./constants";

export const routing = defineRouting({
  locales: AVAILABLE_LOCALES,

  defaultLocale: DEFAULT_LOCALE,
});

export type Locale = (typeof routing.locales)[number];
