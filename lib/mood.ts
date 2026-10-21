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

export const MOODS: Mood[] = ["night", "dawn", "day", "afternoon", "sunset"]

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
  return "sunset" // 18 h à 20 h
}

export function realMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

export function readManual(): { mood: Mood; v: number } | null {
  try {
    const m = localStorage.getItem(KEY_MANUAL) as Mood | null
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

function setThemeColor(mood: Mood, keepOwn: boolean) {
  if (keepOwn) return
  try {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
    const meta = document.createElement("meta")
    meta.name = "theme-color"
    meta.content = THEME_COLORS[mood]
    document.head.appendChild(meta)
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
