"use client"

import { useEffect, useState } from "react"

// Le site cherche le logo dans public/images (peu importe l'extension)
const BASES = ["/images/kiban-logo-light", "/images/kiban-logo-dark"]
const EXTENSIONS = ["png", "PNG", "jpg", "JPG", "jpeg", "JPEG", "webp", "svg"]

const CANDIDATES = BASES.flatMap((base) => EXTENSIONS.map((ext) => `${base}.${ext}`))

export default function KibanLogo({
  tone = "white",
  className = "",
  fallback = "Kiban Collector",
}: {
  tone?: "white" | "black"
  className?: string
  fallback?: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const tryNext = (index: number) => {
      if (cancelled) return
      if (index >= CANDIDATES.length) {
        setFailed(true)
        return
      }

      const candidate = CANDIDATES[index]
      const probe = new window.Image()

      probe.onload = () => {
        if (cancelled) return

        // Recadre automatiquement le logo (retire les marges transparentes)
        try {
          const w = probe.naturalWidth
          const h = probe.naturalHeight
          const canvas = document.createElement("canvas")
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext("2d")
          if (!ctx) throw new Error("no ctx")
          ctx.drawImage(probe, 0, 0)
          const data = ctx.getImageData(0, 0, w, h).data

          let minX = w
          let minY = h
          let maxX = -1
          let maxY = -1
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (data[(y * w + x) * 4 + 3] > 8) {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
              }
            }
          }
          if (maxX < 0) throw new Error("empty")

          const pad = 2
          minX = Math.max(0, minX - pad)
          minY = Math.max(0, minY - pad)
          maxX = Math.min(w - 1, maxX + pad)
          maxY = Math.min(h - 1, maxY + pad)
          const cw = maxX - minX + 1
          const ch = maxY - minY + 1

          const out = document.createElement("canvas")
          out.width = cw
          out.height = ch
          out.getContext("2d")!.drawImage(probe, minX, minY, cw, ch, 0, 0, cw, ch)
          setSrc(out.toDataURL("image/png"))
        } catch {
          setSrc(candidate)
        }
      }

      probe.onerror = () => tryNext(index + 1)
      probe.src = candidate
    }

    tryNext(0)

    return () => {
      cancelled = true
    }
  }, [])

  if (failed) {
    return (
      <span className="font-serif uppercase tracking-wide">{fallback}</span>
    )
  }

  if (!src) {
    // Emplacement réservé pendant la recherche du logo
    return <span className={`block ${className}`} aria-hidden="true" />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={fallback}
      className={className}
      style={{
        filter: tone === "white" ? "brightness(0) invert(1)" : "brightness(0)",
      }}
    />
  )
}
