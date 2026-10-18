/* ====================================================================
   AVATAR FYSU
   Un avatar = une silhouette (corps + vêtements par défaut)
             + un visage (lié à la silhouette)
             + une coiffure (au choix, indépendante de la silhouette)
             + une barbe (facultative, indépendante)
             + des lunettes (facultatif)
             + une teinte de peau + une couleur de cheveux.
   Les images sont dans /public (games-av-*.png) : chaque fichier contient
   l'image (en haut) et son masque de couleurs (en bas).
   La barbe et les lunettes ne changent JAMAIS de couleur.
   ==================================================================== */

export const AV_W = 240
export const AV_H = 616
export const AV_HEAD_H = 240 // hauteur des calques de tête (visage, cheveux, barbe, lunettes)
export const AV_FEET = 592 // ligne des pieds dans l'image (pour poser le personnage)
export const AV_TOP = 52 // haut de la tête (sans cheveux volumineux)

export type Silhouette = "a" | "b"
export type AvatarConfig = {
  sil: Silhouette
  style: number // coiffure (id dans HAIR_STYLES)
  beard: number | null // id dans BEARDS
  glasses: boolean
  skin: string | null
  hair: string | null
}

type Named = { id: number; name: { fr: string; en: string } }

export const HAIR_STYLES: Named[] = [
  { id: 3, name: { fr: "Court", en: "Short" } },
  { id: 0, name: { fr: "Court épais", en: "Thick short" } },
  { id: 6, name: { fr: "Court texturé", en: "Textured short" } },
  { id: 5, name: { fr: "Mèche", en: "Swept" } },
  { id: 8, name: { fr: "Rasé", en: "Buzz cut" } },
  { id: 9, name: { fr: "Rasé court", en: "Close buzz" } },
  { id: 11, name: { fr: "Chauve", en: "Bald" } },
  { id: 1, name: { fr: "Frisé court", en: "Short curls" } },
  { id: 7, name: { fr: "Frisé dessus", en: "Curly top" } },
  { id: 22, name: { fr: "Bouclés courts", en: "Curly crop" } },
  { id: 21, name: { fr: "Courts, créoles", en: "Short, hoops" } },
  { id: 23, name: { fr: "Afro", en: "Afro" } },
  { id: 4, name: { fr: "Tresses collées", en: "Cornrows" } },
  { id: 2, name: { fr: "Long", en: "Long" } },
  { id: 13, name: { fr: "Longs", en: "Long braids" } },
  { id: 17, name: { fr: "Longs lisses", en: "Long straight" } },
  { id: 18, name: { fr: "Frange longue", en: "Long bangs" } },
  { id: 19, name: { fr: "Frange mi-longue", en: "Medium bangs" } },
  { id: 14, name: { fr: "Longs bouclés", en: "Long curls" } },
  { id: 25, name: { fr: "Longues tresses", en: "Box braids" } },
  { id: 15, name: { fr: "Queue de cheval", en: "Ponytail" } },
  { id: 16, name: { fr: "Chignon", en: "Bun" } },
  { id: 24, name: { fr: "Chignon bouclé", en: "Curly bun" } },
]

export const BEARDS: Named[] = [
  { id: 9, name: { fr: "Barbe légère", en: "Light stubble" } },
  { id: 10, name: { fr: "Barbe courte", en: "Short beard" } },
  { id: 8, name: { fr: "Bouc", en: "Goatee" } },
  { id: 11, name: { fr: "Barbe pleine", en: "Full beard" } },
]

/* null = couleur d'origine du dessin */
export const SKIN_PRESETS: (string | null)[] = [null, "#ffe0c8", "#facdaf", "#ebb48c", "#c88c64", "#a56e4b", "#825537", "#5f3c28", "#412a1e"]
export const HAIR_PRESETS: (string | null)[] = [
  null, "#1e1816", "#46301e", "#6e4628", "#96602f", "#a04628", "#be3c28", "#d27832",
  "#ebc86e", "#f0ebd7", "#969699", "#f5f5f5", "#f064aa", "#4682f0", "#3cc878", "#965adc",
]

/* Teinte de peau d'origine de chaque calque (pour tout ramener à la même couleur) */
const NATIVE_HAIR: Record<number, [number, number, number]> = {
  0: [249, 180, 121], 1: [253, 181, 125], 2: [253, 179, 121], 3: [252, 179, 120], 4: [252, 177, 119],
  5: [252, 173, 117], 6: [252, 174, 117], 7: [252, 174, 117], 8: [252, 163, 106], 9: [251, 163, 106],
  11: [247, 165, 119], 13: [253, 177, 118], 14: [253, 171, 113], 15: [252, 179, 126], 16: [253, 184, 132],
  17: [253, 173, 116], 18: [252, 170, 114], 19: [252, 176, 123], 21: [222, 131, 80], 22: [251, 168, 115],
  23: [251, 167, 113], 24: [249, 172, 117], 25: [252, 174, 121],
}
const NATIVE_FACE: Record<Silhouette, [number, number, number]> = { a: [252, 179, 120], b: [253, 177, 118] }
const NATIVE_BODY: Record<Silhouette, [number, number, number]> = { a: [212, 129, 75], b: [219, 121, 79] }

/* Par défaut : le personnage de David (silhouette B, longs cheveux, lunettes). */
export const DEFAULT_AVATAR: AvatarConfig = { sil: "b", style: 13, beard: null, glasses: true, skin: null, hair: null }
const KEY = "fysu-avatar"

const OLD_STYLE: Record<number, number> = { 12: 13, 20: 16, 10: 8 }

export function loadAvatar(): AvatarConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const c = JSON.parse(raw)
      const skin = typeof c?.skin === "string" ? c.skin : null
      const hair = typeof c?.hair === "string" ? c.hair : null
      if (c && (c.sil === "a" || c.sil === "b") && typeof c.style === "number" && HAIR_STYLES.some((h) => h.id === c.style)) {
        return {
          sil: c.sil,
          style: c.style,
          beard: BEARDS.some((b) => b.id === c.beard) ? c.beard : null,
          glasses: !!c.glasses,
          skin,
          hair,
        }
      }
      // ancien format : { head, skin, hair }
      if (typeof c?.head === "number" && c.head >= 0 && c.head <= 25) {
        const head: number = c.head
        return {
          sil: head < 12 ? "a" : "b",
          style: OLD_STYLE[head] ?? head,
          beard: head >= 8 && head <= 11 ? head : null,
          glasses: head === 0 || head === 12,
          skin,
          hair,
        }
      }
    }
  } catch {}
  return { ...DEFAULT_AVATAR }
}

export function saveAvatar(c: AvatarConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {}
}

/* ---------- dessin ---------- */
type Layer = { color: ImageData; mask: ImageData }
const layers = new Map<string, Promise<Layer>>()

function loadLayer(src: string, h: number): Promise<Layer> {
  let p = layers.get(src)
  if (!p) {
    p = new Promise<Layer>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement("canvas")
        c.width = AV_W
        c.height = h * 2
        const ctx = c.getContext("2d", { willReadFrequently: true })
        if (!ctx) return reject(new Error("canvas"))
        ctx.drawImage(img, 0, 0)
        resolve({ color: ctx.getImageData(0, 0, AV_W, h), mask: ctx.getImageData(0, h, AV_W, h) })
      }
      img.onerror = () => reject(new Error(src))
      img.src = src
    })
    layers.set(src, p)
  }
  return p
}

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/* skin : couleur visée pour la peau de ce calque (null = ne pas toucher),
   native : couleur de peau d'origine du calque, hair : couleur de cheveux (null = d'origine) */
function tinted(l: Layer, native: [number, number, number] | null, skin: [number, number, number] | null, hair: [number, number, number] | null): HTMLCanvasElement {
  const w = l.color.width
  const hh = l.color.height
  const out = document.createElement("canvas")
  out.width = w
  out.height = hh
  const ctx = out.getContext("2d")!
  const d = new ImageData(new Uint8ClampedArray(l.color.data), w, hh)
  const m = l.mask.data
  const kr = skin && native ? skin[0] / native[0] : 1
  const kg = skin && native ? skin[1] / native[1] : 1
  const kb = skin && native ? skin[2] / native[2] : 1
  const doSkin = !!skin && !!native
  for (let i = 0; i < d.data.length; i += 4) {
    if (hair && m[i] > 0) {
      const k = m[i] / 100
      d.data[i] = Math.min(255, hair[0] * k)
      d.data[i + 1] = Math.min(255, hair[1] * k)
      d.data[i + 2] = Math.min(255, hair[2] * k)
    } else if (doSkin && m[i + 1] > 0) {
      d.data[i] = Math.min(255, d.data[i] * kr)
      d.data[i + 1] = Math.min(255, d.data[i + 1] * kg)
      d.data[i + 2] = Math.min(255, d.data[i + 2] * kb)
    }
  }
  ctx.putImageData(d, 0, 0)
  return out
}

const rendered = new Map<string, HTMLCanvasElement>()

/* Avatar complet (AV_W × AV_H, fond transparent). */
export async function renderAvatar(cfg: AvatarConfig): Promise<HTMLCanvasElement> {
  const key = `${cfg.sil}|${cfg.style}|${cfg.beard ?? ""}|${cfg.glasses ? 1 : 0}|${cfg.skin ?? ""}|${cfg.hair ?? ""}`
  const hit = rendered.get(key)
  if (hit) return hit
  const sil = cfg.sil
  const [body, face, hairL, beardL, glassL] = await Promise.all([
    loadLayer(`/games-av-body-${sil}.png`, AV_H),
    loadLayer(`/games-av-face-${sil}.png`, AV_HEAD_H),
    loadLayer(`/games-av-hair-${cfg.style}.png`, AV_HEAD_H),
    cfg.beard !== null ? loadLayer(`/games-av-beard-${cfg.beard}.png`, AV_HEAD_H) : Promise.resolve(null),
    cfg.glasses ? loadLayer(`/games-av-glasses-${sil}.png`, AV_HEAD_H) : Promise.resolve(null),
  ])
  const chosen = cfg.skin ? hexRgb(cfg.skin) : null
  const faceTarget = chosen ?? NATIVE_FACE[sil] // sans choix : tout est ramené à la peau du visage
  const hairRgb = cfg.hair ? hexRgb(cfg.hair) : null
  const out = document.createElement("canvas")
  out.width = AV_W
  out.height = AV_H
  const ctx = out.getContext("2d")!
  ctx.drawImage(tinted(body, NATIVE_BODY[sil], chosen, null), 0, 0)
  ctx.drawImage(tinted(face, NATIVE_FACE[sil], faceTarget, null), 0, 0)
  ctx.drawImage(tinted(hairL, NATIVE_HAIR[cfg.style] ?? NATIVE_FACE[sil], faceTarget, hairRgb), 0, 0)
  if (beardL) ctx.drawImage(tinted(beardL, null, null, null), 0, 0) // jamais teintée
  if (glassL) ctx.drawImage(tinted(glassL, null, null, null), 0, 0)
  if (rendered.size > 60) rendered.clear()
  rendered.set(key, out)
  return out
}
