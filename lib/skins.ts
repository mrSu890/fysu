/* ====================================================================
   DÉCORS ET BALLES DÉBLOCABLES
   Chaque jeu liste ses éléments. « need » = meilleur score à atteindre
   dans CE jeu pour débloquer l'élément (0 = disponible dès le départ).
   Pour ajouter un décor : mets l'image dans /public (games-bg-xxx.jpg)
   et ajoute une ligne ci-dessous.
   ==================================================================== */

export type SkinKind = "bg" | "ball"
export type SkinItem = {
  id: string
  name: { fr: string; en: string }
  need: number
  image?: string // décor en image
  colors?: string[] // couleurs (voir chaque jeu)
}

const hoopsBalls: SkinItem[] = [
  { id: "classic", name: { fr: "Classique", en: "Classic" }, need: 0, colors: ["#ff9a4d", "#c4410c", "#2a1005"] },
  { id: "ice", name: { fr: "Glace", en: "Ice" }, need: 4, colors: ["#bff3ff", "#2a8fc9", "#0b2a44"] },
  { id: "pink", name: { fr: "Rose néon", en: "Neon pink" }, need: 8, colors: ["#ff9bd0", "#d11a78", "#4a0a2b"] },
  { id: "gold", name: { fr: "Or", en: "Gold" }, need: 14, colors: ["#fff1a8", "#c9951a", "#5a3a00"] },
  { id: "night", name: { fr: "Nuit", en: "Night" }, need: 22, colors: ["#7a7fa8", "#15162a", "#3fd0ff"] },
]

const poolBalls: SkinItem[] = [
  { id: "classic", name: { fr: "Classique", en: "Classic" }, need: 0, colors: ["#ffd23f", "#ff3d9a", "#3fd0ff", "#ff5a36", "#39ff88", "#b583ff", "#ff9bd0"] },
  { id: "pastel", name: { fr: "Pastel", en: "Pastel" }, need: 4, colors: ["#ffd9e8", "#d9f0ff", "#fff3c4", "#d9ffe8", "#e8dcff", "#ffe0cc"] },
  { id: "mono", name: { fr: "Bleu mono", en: "Blue mono" }, need: 8, colors: ["#3fd0ff", "#2a8fc9", "#8fe3ff", "#1c6fa8", "#b8f0ff"] },
  { id: "gold", name: { fr: "Or et noir", en: "Gold & black" }, need: 14, colors: ["#ffd23f", "#2b2b2b", "#e0a800", "#444", "#fff1a8"] },
]

const poolFelts: SkinItem[] = [
  { id: "green", name: { fr: "Tapis vert", en: "Green felt" }, need: 0, colors: ["#0f6b43", "#1c8a55"] },
  { id: "blue", name: { fr: "Tapis bleu", en: "Blue felt" }, need: 3, colors: ["#134a8a", "#2266b8"] },
  { id: "red", name: { fr: "Tapis rouge", en: "Red felt" }, need: 7, colors: ["#8a1d2b", "#b8323f"] },
  { id: "purple", name: { fr: "Tapis violet", en: "Purple felt" }, need: 12, colors: ["#4a2a8a", "#6a44b8"] },
]

export const SKINS: Record<string, Partial<Record<SkinKind, SkinItem[]>>> = {
  "fysu-hoops": {
    bg: [
      { id: "court", name: { fr: "Terrain de quartier", en: "Street court" }, image: "/games-hoops-court.jpg", need: 0 },
      { id: "night", name: { fr: "Salle de nuit", en: "Night gym" }, need: 0 },
      { id: "tokyo", name: { fr: "Tokyo", en: "Tokyo" }, image: "/games-bg-tokyo.jpg", need: 3 },
      { id: "paris", name: { fr: "Paris", en: "Paris" }, image: "/games-bg-paris.jpg", need: 6 },
      { id: "newyork", name: { fr: "New York", en: "New York" }, image: "/games-bg-newyork.jpg", need: 10 },
      { id: "hawaii", name: { fr: "Hawaï", en: "Hawaii" }, image: "/games-bg-hawaii.jpg", need: 15 },
      { id: "china", name: { fr: "Chine", en: "China" }, image: "/games-bg-china.jpg", need: 20 },
      { id: "kinshasa", name: { fr: "Kinshasa", en: "Kinshasa" }, image: "/games-bg-kinshasa.jpg", need: 30 },
    ],
    ball: hoopsBalls,
  },
  "fysu-pool": { bg: poolFelts, ball: poolBalls },
}

// le décor du basket a une nouvelle clé : le nouveau terrain devient le décor de tout le monde, chacun peut ensuite en changer
export const skinKey = (slug: string, kind: SkinKind) => `fysu-skin-${slug}-${kind}${slug === "fysu-hoops" && kind === "bg" ? "-v2" : ""}`

export function skinItem(slug: string, kind: SkinKind, id: string): SkinItem | undefined {
  return SKINS[slug]?.[kind]?.find((s) => s.id === id)
}

export function skinList(slug: string, kind: SkinKind): SkinItem[] {
  return SKINS[slug]?.[kind] ?? []
}

/* élément choisi (le premier si le choix n'est plus débloqué) */
export function loadSkin(slug: string, kind: SkinKind, best: number): string {
  const list = skinList(slug, kind)
  if (!list.length) return ""
  let id = ""
  try {
    id = localStorage.getItem(skinKey(slug, kind)) || ""
  } catch {}
  const it = list.find((s) => s.id === id)
  return it && it.need <= best ? it.id : list[0].id
}

export function skinText(locale: string) {
  return locale === "fr"
    ? { open: "Skins", bg: "Décors", ball: "Balles", score: "Score", close: "Fermer", unlocked: "DÉBLOQUÉ" }
    : { open: "Skins", bg: "Backgrounds", ball: "Balls", score: "Score", close: "Close", unlocked: "UNLOCKED" }
}
