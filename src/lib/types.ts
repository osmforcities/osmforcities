import type { getTranslations } from "next-intl/server";

// Extract the return type of getTranslations for a namespace
type GetTranslationsReturn = Awaited<ReturnType<typeof getTranslations>>;

export type TranslationFunction = GetTranslationsReturn;
