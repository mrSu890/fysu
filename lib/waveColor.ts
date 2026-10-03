import { WAVE } from "@/lib/brands"

/* Couleurs de la page The Wave (fiches produit et albums) :
   fond choisi dans l'admin, vague = version plus claire, texte noir ou blanc selon la luminosité. */

const HEX = /^#[0-9a-f]{6}$/i

export function normalizeWaveBg(value?: string | null): string | null {
  const v = (value ?? "").trim()
  return HEX.test(v) ? v.toLowerCase() : null
}

function channels(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

export function waveColors(value?: string | null) {
  const bg = normalizeWaveBg(value)
  if (!bg) return { bg: WAVE.RED, wave: WAVE.PINK, ink: "#ffffff" }
  const [r, g, b] = channels(bg)
  const mix = (c: number) => Math.round(c + (255 - c) * 0.5)
  const wave = "#" + [mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return { bg, wave, ink: lum > 0.6 ? "#171717" : "#ffffff" }
}
