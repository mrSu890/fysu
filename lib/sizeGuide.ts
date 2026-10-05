/* ====================================================================
   GUIDE DES TAILLES : tableau de mesures (stocké en cm) affiché en cm ou en pouces.
   Modèles : « haut » (T-shirt, veste…) et « bas » (pantalon…) : le dessin du site
   montre les lignes de mesure A, B, C, D qui correspondent aux colonnes du tableau.
   ==================================================================== */

export type SizeGuideTemplate =
  | "coat"
  | "jacket"
  | "bomber"
  | "blazer"
  | "shirt"
  | "tshirt"
  | "longsleeve"
  | "pants"
  | "skirt"
  | "short"
  | "tie"
  | "bag"
  | "none"
  // anciens modèles (remplacés automatiquement : « top » -> T-shirt, « bottom » -> Pantalon)
  | "top"
  | "bottom"

export type DrawingTemplate = Exclude<SizeGuideTemplate, "none" | "top" | "bottom">

export type SizeGuide = {
  template: SizeGuideTemplate
  columns: string[]
  rows: { size: string; values: string[] }[]
  note?: string
}

// Types de produits proposés dans l'admin (chaque type a son dessin et ses colonnes A, B, C, D)
export const TEMPLATE_LIST: { id: DrawingTemplate; label: string }[] = [
  { id: "coat", label: "Manteau" },
  { id: "jacket", label: "Veste" },
  { id: "bomber", label: "Bomber" },
  { id: "blazer", label: "Blazer" },
  { id: "shirt", label: "Chemise" },
  { id: "tshirt", label: "T-shirt" },
  { id: "longsleeve", label: "Manches longues" },
  { id: "pants", label: "Pantalon" },
  { id: "skirt", label: "Jupe" },
  { id: "short", label: "Short" },
  { id: "tie", label: "Cravate" },
  { id: "bag", label: "Sac" },
]

// Les lettres A, B, C, D du dessin = l'ordre des colonnes
const UPPER = {
  fr: ["Poitrine", "Longueur", "Épaules", "Manche"],
  en: ["Chest width", "Body length", "Shoulder width", "Sleeve length"],
}
const LOWER = {
  fr: ["Taille", "Hanches", "Entrejambe", "Longueur"],
  en: ["Waist", "Hips", "Inseam", "Length"],
}
const PANTS = {
  fr: ["Taille", "Hanches", "Montant", "Longueur"],
  en: ["Waist", "Hips", "Rise", "Length"],
}

// Colonnes proposées pour chaque type : A, B, C, D dans l'ordre (elles correspondent aux lettres du dessin)
export const TEMPLATE_COLUMNS: Record<DrawingTemplate, { fr: string[]; en: string[] }> = {
  coat: UPPER,
  jacket: UPPER,
  bomber: UPPER,
  blazer: UPPER,
  shirt: UPPER,
  tshirt: UPPER,
  longsleeve: UPPER,
  pants: PANTS,
  short: LOWER,
  skirt: {
    fr: ["Taille", "Longueur"],
    en: ["Waist", "Length"],
  },
  tie: {
    fr: ["Longueur", "Largeur", "Largeur haut"],
    en: ["Length", "Blade width", "Narrow width"],
  },
  bag: {
    fr: ["Largeur", "Hauteur", "Profondeur", "Anse"],
    en: ["Width", "Height", "Depth", "Handle drop"],
  },
}

export const isDrawingTemplate = (t: unknown): t is DrawingTemplate =>
  typeof t === "string" && Object.prototype.hasOwnProperty.call(TEMPLATE_COLUMNS, t)

export const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"]

export const emptyGuide = (template: SizeGuideTemplate = "none", lang: "fr" | "en" = "fr"): SizeGuide => {
  const cols = isDrawingTemplate(template) ? [...TEMPLATE_COLUMNS[template][lang]] : ["", ""]
  return {
    template,
    columns: cols,
    rows: DEFAULT_SIZES.map((size) => ({ size, values: Array(cols.length).fill("") })),
    note: "",
  }
}

// nettoie / valide un guide venant du navigateur (côté serveur) ou de la base
export function cleanSizeGuide(input: unknown): SizeGuide | null {
  if (!input || typeof input !== "object") return null
  const g = input as any
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
  let template: SizeGuideTemplate = isDrawingTemplate(g.template) ? g.template : "none"
  let columns: string[] = (Array.isArray(g.columns) ? g.columns : []).slice(0, 12).map((c: unknown) => str(c, 40))
  if (!columns.length) return null
  let order: number[] = columns.map((_, i) => i)

  // anciens modèles : « top » devient T-shirt, « bottom » devient Pantalon
  if (g.template === "top") {
    template = "tshirt"
    const low = columns.map((c) => c.toLowerCase())
    const oldFr = ["poitrine", "longueur", "épaules", "manche"]
    const oldEn = ["chest", "length", "shoulders", "sleeve"]
    const same = (ref: string[]) => low.length === 4 && ref.every((r, i) => low[i] === r)
    // l'ancien ordre (poitrine, longueur, épaules, manche) est remis dans le nouvel ordre A B C D
    // (poitrine, longueur, épaules, manche) est déjà l'ordre A B C D actuel : rien à changer
    if (same(oldFr) || same(oldEn)) order = [0, 1, 2, 3]
  } else if (g.template === "bottom") {
    template = "pants"
  }
  columns = order.map((i) => columns[i])
  const rows = (Array.isArray(g.rows) ? g.rows : [])
    .slice(0, 30)
    .map((r: any) => ({
      size: str(r?.size, 20),
      values: order.map((i: number) => str(Array.isArray(r?.values) ? r.values[i] : "", 20)),
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
