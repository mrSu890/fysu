import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale } from "./routing";

type Messages = Record<string, unknown>;

// Complète la langue choisie avec l'anglais : un texte manquant s'affiche en anglais
function merge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const key of Object.keys(over)) {
    const b = base[key];
    const o = over[key];
    out[key] =
      b && o && typeof b === "object" && typeof o === "object"
        ? merge(b as Messages, o as Messages)
        : o;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = isAppLocale(requested)
    ? requested
    : isAppLocale(cookieLocale)
    ? cookieLocale
    : defaultLocale;

  const english = (await import("../messages/en.json")).default as Messages;
  const own =
    locale === defaultLocale
      ? english
      : ((await import(`../messages/${locale}.json`)).default as Messages);

  return {
    locale,
    messages: merge(english, own),
  };
});
