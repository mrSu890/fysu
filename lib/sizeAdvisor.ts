/* ====================================================================
   CONSEILLER DE TAILLE
   Le calcul se fait sur l'appareil du client (rien n'est envoyé nulle part).
   Il compare le corps du client (taille habituelle, taille en cm, poids, mesure si elle est connue)
   aux mesures du guide des tailles du produit (celles que tu remplis dans l'admin).
   - Hauts (T-shirt, chemise, veste…) : colonne A « Poitrine » (largeur à plat, ou tour complet si > 75 cm)
   - Bas (pantalon, short, jupe) : colonne A « Taille » (à plat, ou tour complet si > 60 cm)
   Ce sont des estimations : le texte du site le dit clairement.
   Les chiffres à régler (aisance voulue, correspondance des tailles) sont tout en haut.
   ==================================================================== */

import { parseMeasure, type SizeGuide } from "@/lib/sizeGuide"

export type Fit = "slim" | "regular" | "loose"
export type Kind = "top" | "bottom"

export type Answers = {
  usual: string // XS … XXL ou ""
  brand: string
  height: string // cm
  weight: string // kg
  measure: string // tour de poitrine (haut) ou de taille (bas), en cm
  fit: Fit
}

export const EMPTY_ANSWERS: Answers = { usual: "", brand: "", height: "", weight: "", measure: "", fit: "regular" }

export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]

// taille habituelle -> tour de poitrine / tour de taille du corps (cm)
const CHEST_OF: Record<string, number> = { XS: 86, S: 92, M: 98, L: 104, XL: 110, XXL: 116 }
const WAIST_OF: Record<string, number> = { XS: 72, S: 78, M: 84, L: 90, XL: 96, XXL: 102 }

// aisance voulue : combien le vêtement fini est plus grand que le corps (cm)
const EASE: Record<Kind, Record<Fit, number>> = {
  top: { slim: 6, regular: 12, loose: 20 },
  bottom: { slim: 2, regular: 4, loose: 8 },
}

const TOP_TEMPLATES = ["coat", "jacket", "bomber", "blazer", "shirt", "tshirt", "longsleeve"]
const BOTTOM_TEMPLATES = ["pants", "short", "skirt"]

export function kindOf(guide: SizeGuide | null): Kind | null {
  if (!guide) return null
  if (TOP_TEMPLATES.includes(guide.template)) return "top"
  if (BOTTOM_TEMPLATES.includes(guide.template)) return "bottom"
  return null
}

const num = (v: string): number | null => {
  const n = parseMeasure(v)
  return n !== null && n > 0 ? n : null
}

// estimation grossière du corps à partir de la taille (cm) et du poids (kg)
const chestFromHW = (h: number, w: number) => 60 + 0.5 * w + 0.1 * (h - 170)
const waistFromHW = (h: number, w: number) => 38 + 0.6 * w + 0.05 * (h - 170)

export type Advice =
  | {
      ok: true
      best: string
      alt: string | null // « entre deux tailles » : l'autre taille possible
      precision: "low" | "good"
      body: number // estimation du corps (cm), pour info
    }
  | { ok: false; reason: "no-guide" | "no-answers" }

export function advise(guide: SizeGuide | null, a: Answers): Advice {
  const kind = kindOf(guide)
  if (!guide || !kind) return { ok: false, reason: "no-guide" }

  const h = num(a.height)
  const w = num(a.weight)
  const own = num(a.measure)
  const usual = a.usual && (kind === "top" ? CHEST_OF[a.usual] : WAIST_OF[a.usual])
  const hw = h && w ? (kind === "top" ? chestFromHW(h, w) : waistFromHW(h, w)) : null

  // on mélange ce qu'on sait (une mesure que le client connaît pèse le plus)
  const parts: [number, number][] = []
  if (own) parts.push([own, 3])
  if (usual) parts.push([usual, 2])
  if (hw) parts.push([hw, 1.5])
  if (!parts.length) return { ok: false, reason: "no-answers" }
  const total = parts.reduce((s, p) => s + p[1], 0)
  const body = parts.reduce((s, p) => s + p[0] * p[1], 0) / total
  const target = body + EASE[kind][a.fit]

  // mesures du vêtement par taille (colonne A), en tour complet
  const full = (v: number) => (kind === "top" ? (v < 75 ? v * 2 : v) : v < 60 ? v * 2 : v)
  const rows = guide.rows
    .map((r) => ({ size: r.size, v: num(r.values[0] ?? "") }))
    .filter((r): r is { size: string; v: number } => r.v !== null)
    .map((r) => ({ size: r.size, garment: full(r.v) }))
  if (!rows.length) return { ok: false, reason: "no-guide" }

  const ranked = [...rows].sort((x, y) => Math.abs(x.garment - target) - Math.abs(y.garment - target))
  const best = ranked[0]
  const second = ranked[1]
  const close = second && Math.abs(second.garment - target) - Math.abs(best.garment - target) < 2.5
  return {
    ok: true,
    best: best.size,
    alt: close ? second.size : null,
    precision: parts.length >= 2 ? "good" : "low",
    body: Math.round(body),
  }
}
