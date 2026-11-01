/* ====================================================================
   AVATAR FYSU
   Un avatar = un corps (calques : peau, bas + chaussures, haut)
             + un visage nu (A ou B)
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
export const AV_FEET = 604 // ligne des pieds dans l'image (pour poser le personnage)
export const AV_TOP = 64 // haut du crâne (sans cheveux volumineux)

export type Silhouette = "a" | "b"
export type Slot = "top" | "bottom"
export type AvatarConfig = {
  sil: Silhouette
  top: string // id d'un haut complet (ITEMS) : veste + chemise = un seul haut
  bottom: string // id d'un bas complet : pantalon / jupe / short + chaussures
  style: number // coiffure (id dans HAIR_STYLES)
  beard: number | null // id dans BEARDS
  glasses: number | null // id dans GLASSES
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

export const GLASSES: Named[] = [
  { id: 6, name: { fr: "Fines", en: "Wire" } },
  { id: 5, name: { fr: "Œil de chat", en: "Cat-eye" } },
  { id: 7, name: { fr: "Solaires", en: "Shades" } },
]
const OLD_GLASSES: Record<number, number> = { 1: 6, 2: 6, 3: 7, 4: 6 }

/* ---------- garde-robe ----------
   Chaque pièce est un calque (games-av-it-<id>.png), sauf les pièces de base
   (t-shirt, pantalon noir, baskets) qui sont toujours possédées.
   Tout le monde peut ESSAYER n'importe quelle pièce ; on ne peut ÉQUIPER
   (donc la garder sur l'avatar, dans le profil, dans les jeux) que ce qu'on possède. */
export type Item = { id: string; slot: Slot; name: { fr: string; en: string }; base?: boolean; legs?: boolean; under?: string }
export const ITEMS: Item[] = [
  // On repart de zéro : seulement les deux pièces de base. Les autres vêtements reviendront un par un, redessinés proprement.
  { id: "tee", slot: "top", base: true, name: { fr: "T-shirt blanc", en: "White tee" } },
  { id: "noir", slot: "bottom", base: true, name: { fr: "Pantalon noir, baskets", en: "Black trousers, sneakers" } },
]
export const itemsOf = (slot: Slot) => ITEMS.filter((i) => i.slot === slot)
const itemById = (id: string | null | undefined) => ITEMS.find((i) => i.id === id)

/* Pièces possédées : les pièces de base + celles débloquées (achat, badge, concours).
   Pour l'instant la liste est lue sur l'appareil ; elle viendra du compte plus tard. */
const OWNED_KEY = "fysu-owned"
export function ownedIds(): string[] {
  const base = ITEMS.filter((i) => i.base).map((i) => i.id)
  try {
    const raw = JSON.parse(localStorage.getItem(OWNED_KEY) || "[]")
    if (Array.isArray(raw)) return [...base, ...raw.filter((x) => typeof x === "string" && ITEMS.some((i) => i.id === x && !i.base))]
  } catch {}
  return base
}
export function grantItem(id: string) {
  try {
    const cur = ownedIds()
    if (!cur.includes(id)) localStorage.setItem(OWNED_KEY, JSON.stringify(cur.filter((x) => !itemById(x)?.base).concat(id)))
  } catch {}
}
/* Remet les pièces non possédées à leur valeur de base. */
export function onlyOwned(c: AvatarConfig): AvatarConfig {
  const own = ownedIds()
  const keep = (id: string, slot: Slot, def: string) => (itemById(id)?.slot === slot && own.includes(id) ? id : def)
  return { ...c, top: keep(c.top, "top", "tee"), bottom: keep(c.bottom, "bottom", "noir") }
}

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

/* Teinte de peau d'origine du visage et du corps (pour changer la couleur de peau) */
const NATIVE_FACE: Record<Silhouette, [number, number, number]> = { a: [253, 173, 123], b: [253, 176, 127] }
const NATIVE_BODY: [number, number, number] = [253, 179, 131]

/* Par défaut : silhouette B, cheveux longs, lunettes. */
export const DEFAULT_AVATAR: AvatarConfig = { sil: "b", top: "tee", bottom: "noir", style: 13, beard: null, glasses: 6, skin: null, hair: null }
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
        return onlyOwned({
          sil: c.sil,
          top: typeof c.top === "string" ? c.top : "tee",
          bottom: typeof c.bottom === "string" ? c.bottom : "noir",
          style: c.style,
          beard: BEARDS.some((b) => b.id === c.beard) ? c.beard : null,
          glasses: GLASSES.some((g) => g.id === c.glasses) ? c.glasses : OLD_GLASSES[c.glasses] ?? (c.glasses === true ? 6 : null),
          skin,
          hair,
        })
      }
      // ancien format : { head, skin, hair }
      if (typeof c?.head === "number" && c.head >= 0 && c.head <= 25) {
        const head: number = c.head
        return {
          ...DEFAULT_AVATAR,
          sil: head < 12 ? "a" : "b",
          style: OLD_STYLE[head] ?? head,
          beard: head >= 8 && head <= 11 ? head : null,
          glasses: head === 0 || head === 12 ? 6 : null,
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
    localStorage.setItem(KEY, JSON.stringify(onlyOwned(c)))
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

const itemImgs = new Map<string, Promise<HTMLCanvasElement>>()
/* calque simple (AV_W × AV_H, sans masque) : vêtements */
function loadItem(src: string): Promise<HTMLCanvasElement> {
  let p = itemImgs.get(src)
  if (!p) {
    p = new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement("canvas")
        c.width = AV_W
        c.height = AV_H
        c.getContext("2d")!.drawImage(img, 0, 0)
        resolve(c)
      }
      img.onerror = () => reject(new Error(src))
      img.src = src
    })
    itemImgs.set(src, p)
  }
  return p
}
async function pieceLayer(id: string, skin: [number, number, number] | null): Promise<HTMLCanvasElement> {
  // pièce avec ses propres jambes : fichier à masque (peau teintée)
  if (itemById(id)?.legs) return tinted(await loadLayer(`/games-av-it-${id}.png`, AV_H), NATIVE_BODY, skin, null)
  if (id === "tee") return tinted(await loadLayer("/games-av-tee.png", AV_H), null, null, null)
  return loadItem(`/games-av-it-${id}.png`)
}
const TORSO_X0 = 76 // torse fin : colonnes conservées sous les hauts (le reste du mannequin est caché ou inutile)
const TORSO_X1 = 164
const FACE_SPLIT = 168 // sous cette ligne : cou (passe derrière le col) ; au-dessus : menton (passe devant)

const rendered = new Map<string, HTMLCanvasElement>()

/* Avatar complet (AV_W × AV_H, fond transparent). */
export async function renderAvatar(cfg: AvatarConfig): Promise<HTMLCanvasElement> {
  const key = `${cfg.sil}|${cfg.top}|${cfg.bottom}|${cfg.style}|${cfg.beard ?? ""}|${cfg.glasses ?? ""}|${cfg.skin ?? ""}|${cfg.hair ?? ""}`
  const hit = rendered.get(key)
  if (hit) return hit
  const sil = cfg.sil
  const bald = cfg.style === 11 // le visage de base est déjà chauve
  // les coupes rasées sont décalées vers le haut sur la silhouette B (crâne plus haut)
  const hairFile = sil === "b" && (cfg.style === 8 || cfg.style === 9) ? `b${cfg.style}` : String(cfg.style)
  const chosen = cfg.skin ? hexRgb(cfg.skin) : null
  const underId = itemById(cfg.top)?.under
  const [skinL, bottomC, topC, face, hairL, beardL, glassL, underC] = await Promise.all([
    loadLayer("/games-av-skin.png", AV_H),
    pieceLayer(itemById(cfg.bottom)?.slot === "bottom" ? cfg.bottom : "noir", chosen),
    pieceLayer(itemById(cfg.top)?.slot === "top" ? cfg.top : "tee", chosen),
    loadLayer(`/games-av-face-${sil}.png`, AV_HEAD_H),
    bald ? Promise.resolve(null) : loadLayer(`/games-av-hair-${hairFile}.png`, AV_HEAD_H),
    cfg.beard !== null ? loadLayer(`/games-av-beard-${sil}-${cfg.beard}.png`, AV_HEAD_H) : Promise.resolve(null),
    cfg.glasses !== null ? loadLayer(`/games-av-glasses-${sil}-${cfg.glasses}.png`, AV_HEAD_H) : Promise.resolve(null),
    underId ? pieceLayer(underId, chosen) : Promise.resolve(null),
  ])
  const hairRgb = cfg.hair ? hexRgb(cfg.hair) : null
  const out = document.createElement("canvas")
  out.width = AV_W
  out.height = AV_H
  const ctx = out.getContext("2d")!
  // ordre : peau, bas + chaussures, (t-shirt), cou, haut complet, menton, cheveux, barbe, lunettes
  ctx.drawImage(tinted(skinL, NATIVE_BODY, chosen, null), 0, 0)
  if (itemById(cfg.bottom)?.legs) ctx.clearRect(0, 352, AV_W, AV_H - 352) // jambes du mannequin remplacées par celles du bas
  const tee = cfg.top === "tee"
  // sous un haut autre que le t-shirt, seul un torse fin reste (les manches viennent de la pièce)
  if (!tee) {
    ctx.clearRect(0, 176, TORSO_X0, 352 - 176)
    ctx.clearRect(TORSO_X1, 176, AV_W - TORSO_X1, 352 - 176)
  }
  ctx.drawImage(bottomC, 0, 0)
  if (tee) ctx.drawImage(topC, 0, 0)
  else if (underC) ctx.drawImage(underC, 0, 0)
  const faceC = tinted(face, NATIVE_FACE[sil], chosen, null)
  ctx.drawImage(faceC, 0, FACE_SPLIT, AV_W, AV_HEAD_H - FACE_SPLIT, 0, FACE_SPLIT, AV_W, AV_HEAD_H - FACE_SPLIT)
  if (!tee) ctx.drawImage(topC, 0, 0)
  ctx.drawImage(faceC, 0, 0, AV_W, FACE_SPLIT, 0, 0, AV_W, FACE_SPLIT)
  if (hairL) ctx.drawImage(tinted(hairL, NATIVE_FACE[sil], chosen, hairRgb), 0, 0) // la peau visible dans la coiffure (front, oreilles) suit la teinte
  if (beardL) ctx.drawImage(tinted(beardL, null, null, null), 0, 0) // jamais teintée
  if (glassL) ctx.drawImage(tinted(glassL, null, null, null), 0, 0)
  if (rendered.size > 80) rendered.clear()
  rendered.set(key, out)
  return out
}

/* Portrait carré (tête et épaules) en JPEG, pour en faire la photo de profil. */
export async function avatarPortrait(cfg: AvatarConfig, bg = "#e8e4dc", size = 320): Promise<Blob> {
  const src = await renderAvatar(cfg)
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d")!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, 20, 14, 200, 200, 0, 0, size, size)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.9))
}
