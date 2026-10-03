"use client"

import { useEffect, useRef, useState } from "react"
import { drawWater, stepBubbles, TOTAL_MS, type Bubble } from "@/lib/waterDraw"

/* ====================================================================
   TRANSITION THE WAVE
   Sans fond : de l'eau qui monte en faisant des bulles jusqu'en haut de l'écran
   et qui redescend en révélant la page déjà chargée derrière.
   Pas affichée si la transition en pixels est déjà en train de jouer (pour ne pas les mélanger).
   ==================================================================== */

export default function WaveLoader() {
  const [show, setShow] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const w = window as any
    const html = document.documentElement

    // première visite du site : l'écran de chargement général passe déjà, pas besoin de doubler
    let seen = false
    try {
      seen = sessionStorage.getItem("fysu:loader:seen") === "1"
    } catch {}
    const calm =
      html.classList.contains("a11y-calm") ||
      html.classList.contains("a11y-focus") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const pixelsPlaying = typeof w.__pxActiveUntil === "number" && Date.now() < w.__pxActiveUntil

    if (!seen || calm || pixelsPlaying) {
      setShow(false)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) {
      setShow(false)
      return
    }

    const prevOverflow = html.style.overflow
    html.style.overflow = "hidden"

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 0
    let H = 0
    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const bubbles: Bubble[] = []
    const start = performance.now()
    let last = start
    let raf = 0

    const frame = (now: number) => {
      const ms = now - start
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (ms >= TOTAL_MS) {
        setShow(false)
        return
      }
      stepBubbles(bubbles, dt, W, H, ms)
      drawWater(ctx, W, H, ms, bubbles)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      html.style.overflow = prevOverflow
    }
  }, [])

  // rend la main à la page à la fin
  useEffect(() => {
    if (show) return
    document.documentElement.style.overflow = ""
  }, [show])

  if (!show) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[90] overflow-hidden"
      style={{ pointerEvents: "all" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
