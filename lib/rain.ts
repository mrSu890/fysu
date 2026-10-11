/* ====================================================================
   MODE PLUIE
   - automatique : quand la météo du visiteur indique de la pluie ou de l'orage
   - manuel : un bouton « Pluie » dans le popup de l'horloge (choix gardé : on / off)
   - effet : classe « rain » sur <html> -> fond très légèrement assombri, fines traînées de pluie
     (components/RainLayer.tsx) et gouttes sur le liquid glass (voir « html.rain » dans globals.css)
   ==================================================================== */

const KEY = "fysu-rain" // "on" | "off" ; absent = automatique

export const RAIN_EVENT = "rain-change"

export function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95
}

export function readRainManual(): boolean | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === "on" ? true : v === "off" ? false : null
  } catch {
    return null
  }
}

export function saveRainManual(on: boolean | null) {
  try {
    if (on === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, on ? "on" : "off")
  } catch {}
}

export function applyRain(on: boolean) {
  const html = document.documentElement
  if (html.classList.contains("rain") === on) return
  html.classList.toggle("rain", on)
  window.dispatchEvent(new Event(RAIN_EVENT))
}
