/* ====================================================================
   AMBIANCES DU SITE : nuit, aube, jour, après-midi
   - par défaut, le site suit l'heure réelle
   - si le visiteur déplace le soleil (petit cadran sur l'heure en bas à droite), son choix est gardé
     jusqu'à ce qu'il touche « Heure réelle »
   - nuit  = sombre bleu-gris brumeux, verre givré  (classes html : dark + night)
   - aube  = clair bleuté céladon, verre bleu       (classe html : dawn)
   - jour  = le blanc cassé d'origine, inchangé     (aucune classe)
   - après-midi = crème chaud, verre vert forêt     (classe html : afternoon)
   - coucher de soleil = taupe chaud, verre fumé    (classes html : dark + sunset)
   Les couleurs sont dans app/globals.css (en bas du fichier).
   Le script de app/layout.tsx refait la même chose avant l'affichage de la page : garde les deux en phase.
   ==================================================================== */

export type Mood = "night" | "dawn" | "day" | "afternoon" | "sunset"

export const MOODS: Mood[] = ["night", "dawn", "day", "afternoon"]

export const MOOD_LABEL: Record<Mood, { fr: string; en: string }> = {
  night: { fr: "Nuit", en: "Night" },
  dawn: { fr: "Aube", en: "Dawn" },
  day: { fr: "Jour", en: "Day" },
  afternoon: { fr: "Après-midi", en: "Afternoon" },
  sunset: { fr: "Coucher de soleil", en: "Sunset" },
}

const KEY_MANUAL = "fysu-mood-manual" // l'ambiance choisie à la main (absente = automatique)
const KEY_V = "fysu-mood-v" // la position du soleil choisie (minutes depuis minuit)

// minutes depuis minuit (0 à 1440) -> ambiance
export function moodAt(minutes: number): Mood {
  const h = (((minutes % 1440) + 1440) % 1440) / 60
  if (h >= 20 || h < 5) return "night"
  if (h < 8) return "dawn"
  if (h < 15) return "day"
  if (h < 18) return "afternoon"
  return "night" // 18 h à 20 h : le coucher de soleil (brun) est supprimé, c'est la nuit calme qui prend le relais
}

export function realMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

export function readManual(): { mood: Mood; v: number } | null {
  try {
    let m = localStorage.getItem(KEY_MANUAL) as Mood | null
    if ((m as string) === "sunset") m = "night" // ancien choix gardé par un visiteur
    if (!m || !MOODS.includes(m)) return null
    const v = parseFloat(localStorage.getItem(KEY_V) || "")
    return { mood: m, v: Number.isFinite(v) ? v : realMinutes() }
  } catch {
    return null
  }
}

export function saveManual(v: number) {
  try {
    localStorage.setItem(KEY_MANUAL, moodAt(v))
    localStorage.setItem(KEY_V, String(Math.round(v)))
  } catch {}
}

export function clearManual() {
  try {
    localStorage.removeItem(KEY_MANUAL)
    localStorage.removeItem(KEY_V)
  } catch {}
}

export function currentMood(): Mood {
  return readManual()?.mood ?? moodAt(realMinutes())
}

// pages qui gardent leur propre fond (TheWave, arcade, Ökēn, Kiban Collector) : on ne touche pas au sombre
const isForced = (html: HTMLElement) =>
  html.classList.contains("wave-page") ||
  html.classList.contains("arcade-page") ||
  html.classList.contains("event-page") ||
  window.location.pathname.startsWith("/kiban-collector")

// couleur de la barre d'état du téléphone (haut de l'écran) : elle suit l'ambiance
const THEME_COLORS: Record<Mood, string> = {
  night: "#212427",
  dawn: "#e9ebe7",
  day: "#faf9f7",
  afternoon: "#f7f3e8",
  sunset: "#6b6454",
}

// la barre d'état du téléphone (bande tout en haut) : sa couleur glisse en 1,4 s, en même temps que les couleurs de la page
let tcCur: [number, number, number] | null = null
let tcRaf = 0
const toRgb = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (c: [number, number, number]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")

function setThemeColor(mood: Mood, keepOwn: boolean) {
  if (keepOwn) return
  try {
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]')) as HTMLMetaElement[]
    let meta = metas[0]
    metas.slice(1).forEach((m) => m.remove())
    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.appendChild(meta)
    }
    meta.removeAttribute("media")
    const to = toRgb(THEME_COLORS[mood])!
    const from = tcCur ?? toRgb(meta.content) ?? to
    cancelAnimationFrame(tcRaf)
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (calm || (from[0] === to[0] && from[1] === to[1] && from[2] === to[2])) {
      tcCur = to
      meta.content = toHex(to)
      return
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400)
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      const cur: [number, number, number] = [0, 1, 2].map((k) => from[k] + (to[k] - from[k]) * e) as [number, number, number]
      tcCur = cur
      meta.content = toHex(cur)
      if (p < 1) tcRaf = requestAnimationFrame(tick)
    }
    tcRaf = requestAnimationFrame(tick)
  } catch {
    /* ignore */
  }
}

// le fondu des ambiances est fait par les variables de couleur de globals.css (voir « SYNCHRO DES AMBIANCES »)
export function applyMood(mood: Mood) {
  const html = document.documentElement
  const admin = window.location.pathname.startsWith("/admin")
  html.classList.toggle("dawn", mood === "dawn" && !admin)
  html.classList.toggle("afternoon", mood === "afternoon" && !admin)
  html.classList.toggle("sunset", mood === "sunset" && !admin)
  html.classList.toggle("night", mood === "night" && !admin)
  const dark = mood === "night" || mood === "sunset"
  if (!isForced(html)) html.classList.toggle("dark", dark)
  try {
    localStorage.setItem("theme", dark ? "dark" : "light")
  } catch {}
  setThemeColor(mood, admin || isForced(html))
  window.dispatchEvent(new Event("theme-change"))
}
