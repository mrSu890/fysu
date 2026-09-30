/* ====================================================================
   TEXTES DES LANGUES AJOUTÉES (allemand, coréen, arabe…)
   Les textes viennent de messages/<langue>.json. Le composant
   ExtraCopyBridge les range ici pour que les fonctions simples
   (getAvailabilityCopy, getColorCopy) puissent les lire.
   ==================================================================== */

type Bucket = Record<string, string>

const registry: Record<string, Record<string, Bucket | undefined>> = {}

export function registerExtraCopy(locale: string, messages: unknown) {
  const m = (messages ?? {}) as Record<string, Bucket | undefined>
  registry[locale] = { Availability: m.Availability, Colors: m.Colors }
}

export function getExtraCopy(locale: string, namespace: "Availability" | "Colors") {
  return registry[locale]?.[namespace]
}
