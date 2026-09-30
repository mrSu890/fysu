import { defineRouting } from "next-intl/routing";

export const locales = [
  "en", "nl", "fr", "ja",
  "de", "es", "it", "pt", "sv", "da", "no", "pl",
  "id", "ms", "sw", "lb",
  "zh", "ko", "th", "he", "ar", "hi", "ta",
] as const;

// Langues qui s'écrivent de droite à gauche
export const rtlLocales: readonly string[] = ["ar", "he"];
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "never",
});

export function isAppLocale(locale: string | undefined): locale is AppLocale {
  return !!locale && locales.includes(locale as AppLocale);
}
