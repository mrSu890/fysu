/* ====================================================================
   CONSEILLER DE TAILLE
   Le calcul se fait sur l'appareil du client (rien n'est envoyé nulle part).

   Principe : tout est ramené à une « position » sur l'échelle XS, S, M, L, XL, XXL (0 à 5).
   - taille habituelle et taille dans une marque : la position de la lettre
   - taille + poids, ou tour de poitrine / de taille : converti en position avec les tableaux plus bas
     (un tableau pour les hommes, un pour les femmes)
   Les réponses sont mélangées (une mesure pèse plus qu'une estimation), puis la coupe voulue décale un peu
   (ajusté = un peu plus petit, ample = un peu plus grand).
   Ensuite on cherche la taille du produit la plus proche :
   - si les tailles de ton guide sont des lettres (XS, S, M, L, XL) : on prend la lettre correspondante
   - si ce sont des chiffres (1, 2, 3…) : on suppose qu'elles montent de la plus petite à la plus grande,
     avec la taille du milieu = M
   Deux façons de trouver la taille du produit :
   1. Le client ne connaît pas de taille (ni la sienne, ni celle d'une marque) et la colonne A du tableau est
      remplie (poitrine pour un haut, taille pour un bas) : on compare le corps du client
      (en cm) aux vraies mesures du vêtement. Chaque pièce est coupée à sa façon (ajustée, ample, oversize) :
      pour ne pas se tromper, on suppose que la taille « M » (ou celle du milieu) est faite pour une personne
      de taille M, et on en déduit l'aisance prévue par la pièce. Quelqu'un qui prend M d'habitude se voit donc
      conseiller le M, et les écarts entre tes tailles (2 cm, 4 cm…) comptent pour les autres.
   2. Dans tous les autres cas (il connaît une taille, ou la colonne A est vide) : on s'appuie sur les lettres
      des tailles (XS, S, M, L, XL), ou sur leur ordre si ce sont des chiffres (1, 2, 3…). Un client qui dit
      « je prends M » se voit conseiller le M : c'est ce qu'il attend, et c'est la réponse la plus fiable.
   La dernière question (« comme prévu / plus ajusté / plus ample ») décale d'une demi-taille environ.
   Ce sont des estimations : le texte du site le dit clairement.
   Les chiffres à régler sont tout en haut.
   ==================================================================== */

import { parseMeasure, type SizeGuide } from "@/lib/sizeGuide"

export type Fit = "slim" | "regular" | "loose"
export type Kind = "top" | "bottom"
export type Gender = "m" | "f" | "u" // homme, femme, peu importe

export type Answers = {
  gender: Gender
  usual: string // XS … XXL ou ""
  brand: string
  brandSize: string // la taille qui lui va parfaitement dans cette marque (XS … XXL) ou ""
  height: string // cm
  weight: string // kg
  measure: string // tour de poitrine (haut) ou de taille (bas), en cm
  fit: Fit
}

export const EMPTY_ANSWERS: Answers = { gender: "u", usual: "", brand: "", brandSize: "", height: "", weight: "", measure: "", fit: "regular" }

export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]

// marques proposées au client (pour ajouter ou retirer une marque : modifie cette liste)
export const BRANDS = ["Zara", "H&M", "Uniqlo", "COS", "Acne Studios", "Maison Kitsuné", "A.P.C.", "Nike"]

// tour de poitrine / de taille du corps (cm) pour chaque lettre : XS, S, M, L, XL, XXL
const CHEST: Record<"m" | "f", number[]> = {
  m: [86, 92, 98, 104, 110, 116],
  f: [80, 85, 90, 96, 102, 108],
}
const WAIST: Record<"m" | "f", number[]> = {
  m: [72, 78, 84, 90, 96, 102],
  f: [62, 67, 72, 78, 84, 90],
}

// décalage de la coupe voulue, en « tailles » (ajusté = un peu plus petit, ample = un peu plus grand)
const SHIFT: Record<Fit, number> = { slim: -0.35, regular: 0, loose: 0.5 }

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
const chestFromHW = (g: "m" | "f", h: number, w: number) => (g === "m" ? 60 + 0.5 * w + 0.1 * (h - 170) : 50 + 0.5 * w + 0.08 * (h - 165))
const waistFromHW = (g: "m" | "f", h: number, w: number) => (g === "m" ? 38 + 0.6 * w + 0.05 * (h - 170) : 33 + 0.55 * w + 0.04 * (h - 165))

// une mesure en cm -> position sur l'échelle XS (0) … XXL (5), avec un tableau
function position(value: number, table: number[]): number {
  if (value <= table[0]) return Math.max(-0.5, (value - table[0]) / (table[1] - table[0]))
  for (let i = 0; i < table.length - 1; i++) {
    if (value <= table[i + 1]) return i + (value - table[i]) / (table[i + 1] - table[i])
  }
  return Math.min(5.5, 5 + (value - table[5]) / (table[5] - table[4]))
}

// moyenne des deux tableaux quand le client répond « peu importe »
const mix = (t: Record<"m" | "f", number[]>): number[] => t.m.map((v, i) => (v + t.f[i]) / 2)

// ce que le client veut en plus ou en moins par rapport à la coupe prévue par la pièce (cm)
const WISH: Record<Kind, Record<Fit, number>> = {
  top: { slim: -5, regular: 0, loose: 6 },
  bottom: { slim: -2, regular: 0, loose: 3 },
}

// position (0 = XS … 5 = XXL) -> cm, avec un tableau (l'inverse de position())
function cmAt(pos: number, table: number[]): number {
  const i = Math.max(0, Math.min(4, Math.floor(pos)))
  return table[i] + (pos - i) * (table[i + 1] - table[i])
}

export type Advice =
  | {
      ok: true
      best: string
      alt: string | null // « entre deux tailles » : l'autre taille possible
      precision: "low" | "good"
      body: number // position estimée (0 = XS … 5 = XXL), pour info
    }
  | { ok: false; reason: "no-guide" | "no-answers" }

export function advise(guide: SizeGuide | null, a: Answers): Advice {
  const kind = kindOf(guide)
  if (!guide || !kind) return { ok: false, reason: "no-guide" }

  const h = num(a.height)
  const w = num(a.weight)
  const own = num(a.measure)
  const table = kind === "top" ? (a.gender === "u" ? mix(CHEST) : CHEST[a.gender]) : a.gender === "u" ? mix(WAIST) : WAIST[a.gender]
  const g: "m" | "f" = a.gender === "f" ? "f" : "m"
  const letter = (l: string) => LETTER_SIZES.indexOf(l)

  // positions sur l'échelle XS … XXL, avec un poids pour chaque réponse
  const parts: [number, number][] = []
  const cms: [number, number][] = [] // la même chose en cm (pour la comparaison avec les mesures du vêtement)
  if (own) {
    parts.push([position(own, table), 3])
    cms.push([own, 3])
  }
  if (a.usual && letter(a.usual) >= 0) {
    parts.push([letter(a.usual), 2])
    cms.push([cmAt(letter(a.usual), table), 2])
  }
  if (a.brand && a.brandSize && letter(a.brandSize) >= 0) {
    parts.push([letter(a.brandSize), 1.5])
    cms.push([cmAt(letter(a.brandSize), table), 1.5])
  }
  if (h && w) {
    const est = a.gender === "u" ? (kind === "top" ? (chestFromHW("m", h, w) + chestFromHW("f", h, w)) / 2 : (waistFromHW("m", h, w) + waistFromHW("f", h, w)) / 2) : kind === "top" ? chestFromHW(g, h, w) : waistFromHW(g, h, w)
    parts.push([position(est, table), 1.5])
    cms.push([est, 1.5])
  }
  if (!parts.length) return { ok: false, reason: "no-answers" }
  const total = parts.reduce((s, p) => s + p[1], 0)
  const pos = parts.reduce((s, p) => s + p[0] * p[1], 0) / total
  const target = pos + SHIFT[a.fit]

  // 1. colonne A remplie : on compare le corps du client aux vraies mesures du vêtement
  const garments = guide.rows
    .map((r) => ({ size: r.size, v: num(r.values[0] ?? "") }))
    .filter((r): r is { size: string; v: number } => r.size !== "" && r.v !== null)
    .map((r) => ({ size: r.size, full: kind === "top" ? (r.v < 75 ? r.v * 2 : r.v) : r.v < 60 ? r.v * 2 : r.v }))
  // le client connaît une taille (la sienne, ou celle d'une marque) : on la respecte, c'est la réponse la plus sûre
  const knowsLetter = (a.usual && letter(a.usual) >= 0) || (a.brand && a.brandSize && letter(a.brandSize) >= 0)
  if (!knowsLetter && garments.length >= 2 && cms.length) {
    // position de chaque taille sur l'échelle XS … XXL : sa lettre, ou son rang (la taille du milieu = M)
    const gl = garments.map((r) => letter(r.size.trim().toUpperCase()))
    const lettered = gl.every((l) => l >= 0)
    const at = garments.map((_, i) => (lettered ? gl[i] : i + 2 - (garments.length - 1) / 2))
    // la taille la plus proche de M est supposée faite pour une personne de taille M : on en déduit l'aisance prévue
    let ref = 0
    at.forEach((p, i) => {
      if (Math.abs(p - 2) < Math.abs(at[ref] - 2)) ref = i
    })
    const ease = garments[ref].full - cmAt(Math.max(0, Math.min(5, at[ref])), table)
    const ct = cms.reduce((s, p) => s + p[1], 0)
    const body = cms.reduce((s, p) => s + p[0] * p[1], 0) / ct
    const want = body + ease + WISH[kind][a.fit]
    const order = [...garments].sort((x, y) => Math.abs(x.full - want) - Math.abs(y.full - want))
    const close = !!order[1] && Math.abs(order[1].full - want) - Math.abs(order[0].full - want) < 2.5
    return {
      ok: true,
      best: order[0].size,
      alt: close ? order[1].size : null,
      precision: cms.length >= 2 ? "good" : "low",
      body: Math.round(pos * 10) / 10,
    }
  }

  // 2. sinon : les lettres des tailles (ou leur ordre)
  const rows = guide.rows.map((r) => r.size).filter(Boolean)
  if (!rows.length) return { ok: false, reason: "no-guide" }
  const letters = rows.map((r) => letter(r.trim().toUpperCase()))
  const lettered = letters.every((l) => l >= 0)
  // tailles en chiffres : la taille du milieu = M (position 2)
  const placed = rows.map((size, i) => ({ size, at: lettered ? letters[i] : i + 2 - (rows.length - 1) / 2 }))

  const ranked = [...placed].sort((x, y) => Math.abs(x.at - target) - Math.abs(y.at - target))
  const best = ranked[0]
  const second = ranked[1]
  const d1 = Math.abs(best.at - target)
  const d2 = second ? Math.abs(second.at - target) : 9
  const close = !!second && d1 >= 0.3 && d2 - d1 <= 0.4
  return {
    ok: true,
    best: best.size,
    alt: close ? second.size : null,
    precision: parts.length >= 2 ? "good" : "low",
    body: Math.round(pos * 10) / 10,
  }
}
