/* ====================================================================
   TEXTES DU SÉLECTEUR DE COULEUR (en / fr / nl / ja)
   ==================================================================== */

type L4 = { en: string; fr: string; nl: string; ja: string }

const COPY = {
  color: { en: "Color", fr: "Couleur", nl: "Kleur", ja: "カラー" },
  colorSoldOut: {
    en: "Sold out in this color",
    fr: "Épuisé dans cette couleur",
    nl: "Uitverkocht in deze kleur",
    ja: "このカラーは売り切れです",
  },
  backTo: { en: "Back to", fr: "Retour à", nl: "Terug naar", ja: "戻る：" },
} satisfies Record<string, L4>

export type ColorCopy = Record<keyof typeof COPY, string>

export function getColorCopy(locale: string): ColorCopy {
  const l: keyof L4 = locale === "fr" || locale === "nl" || locale === "ja" ? locale : "en"
  const out = {} as ColorCopy
  for (const key of Object.keys(COPY) as (keyof typeof COPY)[]) {
    out[key] = COPY[key][l]
  }
  return out
}
