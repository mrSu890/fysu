"use client"

import { useEffect, useRef } from "react"
import { renderAvatar, type AvatarConfig } from "@/lib/avatar"

/* Dessine un avatar (ou une partie : « crop » en pixels de l'image d'origine). */
export default function AvatarCanvas({
  cfg,
  crop,
  width,
  height,
  className,
}: {
  cfg: AvatarConfig
  crop?: { x: number; y: number; w: number; h: number }
  width: number
  height: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const { head, skin, hair } = cfg
  const cx = crop?.x ?? 0
  const cy = crop?.y ?? 0
  const cw = crop?.w ?? 240
  const ch = crop?.h ?? 616

  useEffect(() => {
    let alive = true
    renderAvatar({ head, skin, hair })
      .then((src) => {
        const cv = ref.current
        if (!alive || !cv) return
        const ctx = cv.getContext("2d")
        if (!ctx) return
        ctx.clearRect(0, 0, cv.width, cv.height)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(src, cx, cy, cw, ch, 0, 0, cv.width, cv.height)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [head, skin, hair, cx, cy, cw, ch])

  return <canvas ref={ref} width={width} height={height} className={className} style={{ imageRendering: "pixelated" }} />
}
