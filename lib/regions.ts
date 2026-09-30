import { locales } from "@/i18n/routing"

/* ====================================================================
   ZONES ET PAYS  (faciles à modifier)

   - Pour ajouter un pays : ajoute une ligne dans COUNTRIES.
   - "languages" = les langues officielles / principales du pays.
   - Le site n'affiche que les langues qu'il possède vraiment (voir
     i18n/routing.ts). Si un pays a une langue que le site n'a pas
     encore, l'anglais est proposé. L'anglais est proposé partout.
   - Le jour où une langue est ajoutée au site (ex: "de"), elle s'active
     toute seule pour tous les pays qui la parlent.
   ==================================================================== */

export type ContinentId =
  | "europe"
  | "asia"
  | "northAmerica"
  | "southAmerica"
  | "africa"
  | "oceania"

export const CONTINENTS: ContinentId[] = [
  "europe",
  "asia",
  "northAmerica",
  "southAmerica",
  "africa",
  "oceania",
]

export type Country = {
  code: string // code pays ISO (ex: "BE")
  name: string // nom de secours en anglais
  continent: ContinentId
  languages: string[]
}

export const COUNTRIES: Country[] = [
  // ----- Europe -----
  { code: "DE", name: "Germany", continent: "europe", languages: ["de"] },
  { code: "FR", name: "France", continent: "europe", languages: ["fr"] },
  { code: "GB", name: "United Kingdom", continent: "europe", languages: ["en"] },
  { code: "IT", name: "Italy", continent: "europe", languages: ["it"] },
  { code: "ES", name: "Spain", continent: "europe", languages: ["es"] },
  { code: "NL", name: "Netherlands", continent: "europe", languages: ["nl"] },
  { code: "BE", name: "Belgium", continent: "europe", languages: ["nl", "fr", "de"] },
  { code: "CH", name: "Switzerland", continent: "europe", languages: ["de", "fr", "it"] },
  { code: "LU", name: "Luxembourg", continent: "europe", languages: ["lb", "fr", "de"] },
  { code: "AT", name: "Austria", continent: "europe", languages: ["de"] },
  { code: "PT", name: "Portugal", continent: "europe", languages: ["pt"] },
  { code: "IE", name: "Ireland", continent: "europe", languages: ["en"] },
  { code: "SE", name: "Sweden", continent: "europe", languages: ["sv"] },
  { code: "DK", name: "Denmark", continent: "europe", languages: ["da"] },
  { code: "NO", name: "Norway", continent: "europe", languages: ["no"] },
  { code: "PL", name: "Poland", continent: "europe", languages: ["pl"] },

  // ----- Asie (Moyen-Orient inclus) -----
  { code: "JP", name: "Japan", continent: "asia", languages: ["ja"] },
  { code: "CN", name: "China", continent: "asia", languages: ["zh"] },
  { code: "KR", name: "South Korea", continent: "asia", languages: ["ko"] },
  { code: "IN", name: "India", continent: "asia", languages: ["hi", "en"] },
  { code: "SG", name: "Singapore", continent: "asia", languages: ["en", "zh", "ms", "ta"] },
  { code: "HK", name: "Hong Kong", continent: "asia", languages: ["zh", "en"] },
  { code: "TW", name: "Taiwan", continent: "asia", languages: ["zh"] },
  { code: "TH", name: "Thailand", continent: "asia", languages: ["th"] },
  { code: "ID", name: "Indonesia", continent: "asia", languages: ["id"] },
  { code: "AE", name: "United Arab Emirates", continent: "asia", languages: ["ar", "en"] },
  { code: "SA", name: "Saudi Arabia", continent: "asia", languages: ["ar"] },
  { code: "IL", name: "Israel", continent: "asia", languages: ["he", "ar"] },

  // ----- Amérique du Nord -----
  { code: "US", name: "United States", continent: "northAmerica", languages: ["en"] },
  { code: "CA", name: "Canada", continent: "northAmerica", languages: ["en", "fr"] },
  { code: "MX", name: "Mexico", continent: "northAmerica", languages: ["es"] },

  // ----- Amérique du Sud -----
  { code: "BR", name: "Brazil", continent: "southAmerica", languages: ["pt"] },
  { code: "AR", name: "Argentina", continent: "southAmerica", languages: ["es"] },
  { code: "CL", name: "Chile", continent: "southAmerica", languages: ["es"] },
  { code: "CO", name: "Colombia", continent: "southAmerica", languages: ["es"] },
  { code: "PE", name: "Peru", continent: "southAmerica", languages: ["es"] },

  // ----- Afrique -----
  { code: "ZA", name: "South Africa", continent: "africa", languages: ["en"] },
  { code: "NG", name: "Nigeria", continent: "africa", languages: ["en"] },
  { code: "EG", name: "Egypt", continent: "africa", languages: ["ar"] },
  { code: "MA", name: "Morocco", continent: "africa", languages: ["ar", "fr"] },
  { code: "KE", name: "Kenya", continent: "africa", languages: ["en", "sw"] },
  { code: "CI", name: "Côte d'Ivoire", continent: "africa", languages: ["fr"] },
  { code: "SN", name: "Senegal", continent: "africa", languages: ["fr"] },

  // ----- Océanie -----
  { code: "AU", name: "Australia", continent: "oceania", languages: ["en"] },
  { code: "NZ", name: "New Zealand", continent: "oceania", languages: ["en"] },
]

// Nom de chaque langue du site, écrit dans sa propre langue
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "Français",
  nl: "Nederlands",
  ja: "日本語",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  sv: "Svenska",
  da: "Dansk",
  no: "Norsk",
  pl: "Polski",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  sw: "Kiswahili",
  lb: "Lëtzebuergesch",
  zh: "中文",
  ko: "한국어",
  th: "ไทย",
  he: "עברית",
  ar: "العربية",
  hi: "हिन्दी",
  ta: "தமிழ்",
}

/** Langues à proposer pour un pays : celles du pays que le site possède, puis toujours l'anglais. */
export function offeredLanguages(country: Country): string[] {
  const result = country.languages.filter((l) =>
    (locales as readonly string[]).includes(l)
  )
  if (!result.includes("en")) result.push("en")
  return result
}

/* ====== Mémoire du choix (cookies, valables 1 an) ====== */

export const COUNTRY_COOKIE = "FYSU_COUNTRY"

export function getStoredCountry(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COUNTRY_COOKIE}=`))
  const value = match?.split("=")[1]
  return value ? decodeURIComponent(value) : null
}

export function saveRegion(countryCode: string, locale: string) {
  const opts = "path=/; max-age=31536000; samesite=lax"
  document.cookie = `${COUNTRY_COOKIE}=${encodeURIComponent(countryCode)}; ${opts}`
  document.cookie = `NEXT_LOCALE=${locale}; ${opts}`
}

/* ====== Affichage ====== */

export function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 127397 + c.charCodeAt(0))
  )
}

export function countryName(code: string, locale: string): string {
  try {
    const names = new Intl.DisplayNames([locale], { type: "region" })
    return names.of(code) ?? COUNTRIES.find((c) => c.code === code)?.name ?? code
  } catch {
    return COUNTRIES.find((c) => c.code === code)?.name ?? code
  }
}
