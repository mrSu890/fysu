/* ====================================================================
   AVATAR FYSU
   Un avatar = une silhouette (corps + vêtements par défaut) + une coiffure
   (tête complète : cheveux, barbe, lunettes...) + une teinte de peau
   + une couleur de cheveux. Les images sont dans /public (games-av-*.png) :
   chaque fichier contient l'image (en haut) et son masque de couleurs (en bas).
   ==================================================================== */

export const AV_W = 240
export const AV_H = 616
export const AV_FEET = 592 // ligne des pieds dans l'image (pour poser le personnage)
export const AV_TOP = 52 // haut de la tête (sans cheveux volumineux)

export type Silhouette = "a" | "b"
export type AvatarConfig = { head: number; skin: string | null; hair: string | null }

export type HeadItem = { id: number; sil: Silhouette; name: { fr: string; en: string } }

export const HEADS: HeadItem[] = [
  { id: 3, sil: "a", name: { fr: "Court", en: "Short" } },
  { id: 0, sil: "a", name: { fr: "Court, lunettes", en: "Short, glasses" } },
  { id: 6, sil: "a", name: { fr: "Court texturé", en: "Textured short" } },
  { id: 5, sil: "a", name: { fr: "Mèche", en: "Swept" } },
  { id: 1, sil: "a", name: { fr: "Frisé court", en: "Short curls" } },
  { id: 7, sil: "a", name: { fr: "Frisé dessus", en: "Curly top" } },
  { id: 4, sil: "a", name: { fr: "Tresses collées", en: "Cornrows" } },
  { id: 2, sil: "a", name: { fr: "Long", en: "Long" } },
  { id: 8, sil: "a", name: { fr: "Rasé, bouc", en: "Buzz, goatee" } },
  { id: 9, sil: "a", name: { fr: "Rasé, barbe légère", en: "Buzz, light stubble" } },
  { id: 10, sil: "a", name: { fr: "Rasé, barbe courte", en: "Buzz, short beard" } },
  { id: 11, sil: "a", name: { fr: "Chauve, barbe", en: "Bald, beard" } },
  { id: 13, sil: "b", name: { fr: "Longs", en: "Long" } },
  { id: 12, sil: "b", name: { fr: "Longs, lunettes", en: "Long, glasses" } },
  { id: 17, sil: "b", name: { fr: "Longs lisses", en: "Long straight" } },
  { id: 18, sil: "b", name: { fr: "Frange longue", en: "Long bangs" } },
  { id: 19, sil: "b", name: { fr: "Frange mi-longue", en: "Medium bangs" } },
  { id: 14, sil: "b", name: { fr: "Longs bouclés", en: "Long curls" } },
  { id: 25, sil: "b", name: { fr: "Longues tresses", en: "Long braids" } },
  { id: 15, sil: "b", name: { fr: "Queue de cheval", en: "Ponytail" } },
  { id: 16, sil: "b", name: { fr: "Chignon", en: "Bun" } },
  { id: 20, sil: "b", name: { fr: "Chignon bas", en: "Low bun" } },
  { id: 24, sil: "b", name: { fr: "Chignon bouclé", en: "Curly bun" } },
  { id: 22, sil: "b", name: { fr: "Bouclés courts", en: "Short curls" } },
  { id: 21, sil: "b", name: { fr: "Courts, créoles", en: "Short, hoops" } },
  { id: 23, sil: "b", name: { fr: "Afro", en: "Afro" } },
]

export const silOf = (head: number): Silhouette => (head < 12 ? "a" : "b")

/* null = couleur d'origine du dessin */
export const SKIN_PRESETS: (string | null)[] = [null, "#ffe0c8", "#facdaf", "#ebb48c", "#c88c64", "#a56e4b", "#825537", "#5f3c28", "#412a1e"]
export const HAIR_PRESETS: (string | null)[] = [
  null, "#1e1816", "#46301e", "#6e4628", "#96602f", "#a04628", "#be3c28", "#d27832",
  "#ebc86e", "#f0ebd7", "#969699", "#f5f5f5", "#f064aa", "#4682f0", "#3cc878", "#965adc",
]

export const DEFAULT_AVATAR: AvatarConfig = { head: 12, skin: null, hair: null }
const KEY = "fysu-avatar"

export function loadAvatar(): AvatarConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (typeof c?.head === "number" && c.head >= 0 && c.head <= 25) {
        return { head: c.head, skin: typeof c.skin === "string" ? c.skin : null, hair: typeof c.hair === "string" ? c.hair : null }
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

function loadLayer(src: string): Promise<Layer> {
  let p = layers.get(src)
  if (!p) {
    p = new Promise<Layer>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement("canvas")
        c.width = AV_W
        c.height = AV_H * 2
        const ctx = c.getContext("2d", { willReadFrequently: true })
        if (!ctx) return reject(new Error("canvas"))
        ctx.drawImage(img, 0, 0)
        resolve({ color: ctx.getImageData(0, 0, AV_W, AV_H), mask: ctx.getImageData(0, AV_H, AV_W, AV_H) })
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

function tinted(l: Layer, skin: string | null, hair: string | null): HTMLCanvasElement {
  const out = document.createElement("canvas")
  out.width = AV_W
  out.height = AV_H
  const ctx = out.getContext("2d")!
  const d = new ImageData(new Uint8ClampedArray(l.color.data), AV_W, AV_H)
  const m = l.mask.data
  const s = skin ? hexRgb(skin) : null
  const h = hair ? hexRgb(hair) : null
  for (let i = 0; i < d.data.length; i += 4) {
    if (h && m[i] > 0) {
      const k = m[i] / 100
      d.data[i] = Math.min(255, h[0] * k)
      d.data[i + 1] = Math.min(255, h[1] * k)
      d.data[i + 2] = Math.min(255, h[2] * k)
    } else if (s && m[i + 1] > 0) {
      const k = m[i + 1] / 100
      d.data[i] = Math.min(255, s[0] * k)
      d.data[i + 1] = Math.min(255, s[1] * k)
      d.data[i + 2] = Math.min(255, s[2] * k)
    }
  }
  ctx.putImageData(d, 0, 0)
  return out
}

const rendered = new Map<string, HTMLCanvasElement>()

/* Avatar complet (AV_W × AV_H, fond transparent). */
export async function renderAvatar(cfg: AvatarConfig): Promise<HTMLCanvasElement> {
  const key = `${cfg.head}|${cfg.skin ?? ""}|${cfg.hair ?? ""}`
  const hit = rendered.get(key)
  if (hit) return hit
  const sil = silOf(cfg.head)
  const [body, head] = await Promise.all([loadLayer(`/games-av-body-${sil}.png`), loadLayer(`/games-av-head-${cfg.head}.png`)])
  const out = document.createElement("canvas")
  out.width = AV_W
  out.height = AV_H
  const ctx = out.getContext("2d")!
  ctx.drawImage(tinted(body, cfg.skin, null), 0, 0)
  ctx.drawImage(tinted(head, cfg.skin, cfg.hair), 0, 0)
  if (rendered.size > 60) rendered.clear()
  rendered.set(key, out)
  return out
}
