"use client"

import { useState } from "react"
import { WAVE } from "@/lib/brands"
import { normalizeWaveBg } from "@/lib/waveColor"

/* ====================================================================
   Choix de la couleur de fond de la page The Wave (produit ou album).
   Bouton « Prendre la couleur de l'image » : on regarde l'image du produit
   (ou la pochette) et on propose sa couleur dominante, un peu renforcée.
   ==================================================================== */

function toHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

// couleur dominante d'une image : on ignore le blanc, le noir et le gris, on garde la teinte qui revient le plus
async function dominantColor(url: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = "anonymous"
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("image"))
    el.src = url
  })

  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("canvas")
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size) // peut échouer si l'image n'est pas lisible

  // 24 familles de teintes ; chaque pixel compte plus s'il est coloré
  const buckets = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
  let avg = { r: 0, g: 0, b: 0, n: 0 }
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 200) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    avg = { r: avg.r + r, g: avg.g + g, b: avg.b + b, n: avg.n + 1 }
    const { h, s, l } = rgbToHsl(r, g, b)
    if (l > 0.93 || l < 0.08 || s < 0.18) continue
    const w = s * (1 - Math.abs(2 * l - 1) * 0.6)
    const k = Math.floor(h / 15) % 24
    buckets[k].w += w
    buckets[k].r += r * w
    buckets[k].g += g * w
    buckets[k].b += b * w
  }

  const best = buckets.reduce((m, x) => (x.w > m.w ? x : m), buckets[0])
  let r: number, g: number, b: number
  if (best.w > 0.5) {
    r = best.r / best.w
    g = best.g / best.w
    b = best.b / best.w
  } else if (avg.n) {
    r = avg.r / avg.n
    g = avg.g / avg.n
    b = avg.b / avg.n
  } else {
    throw new Error("vide")
  }

  // « couleur soutenue » : assez vive et ni trop claire ni trop sombre, pour que la vague reste belle
  const hsl = rgbToHsl(r, g, b)
  const out = hslToRgb(hsl.h, Math.max(hsl.s, 0.55), Math.min(0.5, Math.max(0.3, hsl.l)))
  return toHex(out.r, out.g, out.b)
}

export default function WaveColorField({
  value,
  onChange,
  imageUrl,
}: {
  value: string
  onChange: (v: string) => void
  imageUrl?: string | null
}) {
  const valid = normalizeWaveBg(value)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  async function fromImage() {
    if (!imageUrl) return
    setBusy(true)
    setNote("")
    try {
      onChange(await dominantColor(imageUrl))
    } catch {
      setNote("Impossible de lire cette image. Choisis la couleur à la main.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-[#3d3a35]">Couleur de fond The Wave</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label="Couleur de fond"
          value={valid ?? WAVE.RED}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-[#e6e1d8] bg-white p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#e10813"
          maxLength={7}
          className="h-10 w-28 rounded border border-[#e6e1d8] bg-white px-2 text-sm"
        />
        {imageUrl && (
          <button
            type="button"
            onClick={fromImage}
            disabled={busy}
            className="h-10 cursor-pointer rounded border border-[#e6e1d8] bg-white px-3 text-xs disabled:opacity-50"
          >
            {busy ? "Analyse…" : "Prendre la couleur de l'image"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange("")}
          className="h-10 cursor-pointer rounded border border-[#e6e1d8] bg-white px-3 text-xs"
        >
          Rouge par défaut
        </button>
      </div>
      {note && <p className="mt-1 text-[11px] text-[#9b1c1c]">{note}</p>}
      <p className="mt-1 text-[11px] text-[#7a756c]">
        La vague prend automatiquement une teinte plus claire de cette couleur. Choisis plutôt une couleur soutenue.
        {!imageUrl && " Ajoute d'abord une image pour pouvoir prendre sa couleur."}
      </p>
    </div>
  )
}
