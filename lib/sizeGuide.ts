/* ====================================================================
   GUIDE DES TAILLES : tableau de mesures (stocké en cm) affiché en cm ou en pouces.
   Modèles : « haut » (T-shirt, veste…) et « bas » (pantalon…) : le dessin du site
   montre les lignes de mesure A, B, C, D qui correspondent aux colonnes du tableau.
   ==================================================================== */

export type SizeGuideTemplate = "top" | "bottom" | "none"

export type SizeGuide = {
  template: SizeGuideTemplate
  columns: string[]
  rows: { size: string; values: string[] }[]
  note?: string
}

export const TEMPLATE_COLUMNS: Record<"top" | "bottom", { fr: string[]; en: string[] }> = {
  top: {
    fr: ["Poitrine", "Longueur", "Épaules", "Manche"],
    en: ["Chest", "Length", "Shoulders", "Sleeve"],
  },
  bottom: {
    fr: ["Taille", "Hanches", "Entrejambe", "Longueur"],
    en: ["Waist", "Hips", "Inseam", "Length"],
  },
}

export const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"]

export const emptyGuide = (template: SizeGuideTemplate = "none", lang: "fr" | "en" = "fr"): SizeGuide => ({
  template,
  columns: template === "none" ? ["", ""] : [...TEMPLATE_COLUMNS[template][lang]],
  rows: DEFAULT_SIZES.map((size) => ({
    size,
    values: Array(template === "none" ? 2 : 4).fill(""),
  })),
  note: "",
})

// nettoie / valide un guide venant du navigateur (côté serveur) ou de la base
export function cleanSizeGuide(input: unknown): SizeGuide | null {
  if (!input || typeof input !== "object") return null
  const g = input as any
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
  const template: SizeGuideTemplate = g.template === "top" || g.template === "bottom" ? g.template : "none"
  const columns = (Array.isArray(g.columns) ? g.columns : []).slice(0, 12).map((c: unknown) => str(c, 40))
  if (!columns.length) return null
  const rows = (Array.isArray(g.rows) ? g.rows : [])
    .slice(0, 30)
    .map((r: any) => ({
      size: str(r?.size, 20),
      values: columns.map((_: string, i: number) => str(Array.isArray(r?.values) ? r.values[i] : "", 20)),
    }))
    .filter((r: { size: string; values: string[] }) => r.size)
  if (!rows.length) return null
  const note = str(g.note, 600)
  return { template, columns, rows, ...(note ? { note } : {}) }
}

// « 52,5 » ou « 52.5 » -> 52.5 ; autre chose (« — », « 52-54 ») -> null
export function parseMeasure(v: string): number | null {
  const n = Number(String(v).trim().replace(",", "."))
  return Number.isFinite(n) && String(v).trim() !== "" ? n : null
}

export function formatMeasure(v: string, unit: "cm" | "in"): string {
  const n = parseMeasure(v)
  if (n === null) return v || "—"
  if (unit === "cm") return Number.isInteger(n) ? String(n) : n.toFixed(1)
  const inches = n / 2.54
  return (Math.round(inches * 10) / 10).toFixed(1)
}
