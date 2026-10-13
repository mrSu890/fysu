"use client"

import { useEffect, useRef, useState } from "react"
import { RAIN_EVENT } from "@/lib/rain"

/* Mode pluie à l'intérieur d'un bloc qui a son propre fond plein (ex. le bloc texte de l'accueil).
   La pluie globale (RainLayer) est derrière le contenu : un bloc au fond plein la cache.
   Ce composant dessine la même pluie, uniquement sur le fond de ce bloc, derrière son texte.
   À placer comme premier enfant d'un bloc "relative" qui crée son propre empilement (ex. relative z-10). */

export default function RainFill() {
  const [on, setOn] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const read = () => setOn(document.documentElement.classList.contains("rain"))
    read()
    window.addEventListener(RAIN_EVENT, read)
    return () => window.removeEventListener(RAIN_EVENT, read)
  }, [])

  useEffect(() => {
    if (!on) return
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let w = 0
    let h = 0
    let raf = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const mk = (y?: number) => ({
      x: Math.random() * (w + 80) - 40,
      y: y ?? Math.random() * h,
      len: 10 + Math.random() * 16,
      speed: 520 + Math.random() * 420,
      a: 0.07 + Math.random() * 0.13,
    })
    let drops: ReturnType<typeof mk>[] = []
    const resize = () => {
      w = wrap.clientWidth
      h = wrap.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // même densité que la pluie globale (≈ 70 traits sur un écran de bureau)
      const count = Math.max(8, Math.round((w * h) / (w < 640 ? 8500 : 14000)))
      drops = Array.from({ length: count }, () => mk())
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const slant = 0.18
    let last = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      ctx.clearRect(0, 0, w, h)
      const dark = document.documentElement.classList.contains("dark")
      ctx.lineWidth = 1
      ctx.lineCap = "round"
      for (const d of drops) {
        d.y += d.speed * dt
        d.x -= d.speed * dt * slant
        if (d.y - d.len > h || d.x < -60) Object.assign(d, mk(-d.len), { x: Math.random() * (w + 80) })
        ctx.strokeStyle = dark ? `rgba(235,240,245,${d.a})` : `rgba(40,50,60,${d.a})`
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x + d.len * slant, d.y - d.len)
        ctx.stroke()
      }
      raf = requestAnimationFrame(tick)
    }
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (document.visibilityState === "visible") {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener("visibilitychange", onVis)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [on])

  return (
    <div ref={wrapRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 transition-opacity duration-[2000ms]"
        style={{ background: "rgba(24,30,38,0.08)", opacity: on ? 1 : 0 }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-[2000ms]"
        style={{ opacity: on ? 1 : 0 }}
      />
    </div>
  )
}
