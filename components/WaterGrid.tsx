"use client"

import { useEffect, useRef } from "react"
import {
  drawWater,
  dropLevel,
  riseLevel,
  stepBubbles,
  DROP_MS,
  RISE_MS,
  TOP,
  type Bubble,
} from "@/lib/waterDraw"

/* ====================================================================
   RIDEAU D'EAU (transition vers / depuis The Wave)
   Même rôle que le rideau de pixels, avec les mêmes 3 temps :
   - "in"    : l'eau monte jusqu'en haut de l'écran (on reste sur la même page)
   - "solid" : tout est couvert, la nouvelle page se charge derrière
   - "out"   : l'eau redescend et révèle la page déjà prête
   ==================================================================== */

export type WaterMode = "in" | "solid" | "out"

export default function WaterGrid({ mode, onDone }: { mode: WaterMode; onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bubbles = useRef<Bubble[]>([])
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const sizeRef = useRef({ w: 0, h: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) {
      doneRef.current?.()
      return
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      sizeRef.current = { w: W, h: H }
      // on ne touche à la taille que si elle change (sinon le canvas se vide et l'écran clignote)
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const start = performance.now()
    let last = start
    let raf = 0
    let finished = false

    const frame = (now: number) => {
      const ms = now - start
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { w, h } = sizeRef.current
      const lv =
        mode === "in"
          ? (o: number) => riseLevel(ms + o)
          : mode === "out"
          ? (o: number) => dropLevel(ms + o)
          : () => TOP
      stepBubbles(bubbles.current, dt, w, h, now / 1000, lv(0))
      drawWater(ctx, w, h, now / 1000, lv, bubbles.current)

      const end = mode === "in" ? RISE_MS : mode === "out" ? DROP_MS : Infinity
      if (!finished && ms >= end) {
        finished = true
        doneRef.current?.()
        if (mode === "out") return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [mode])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}
