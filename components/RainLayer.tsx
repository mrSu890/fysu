"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { RAIN_EVENT } from "@/lib/rain"

/* Mode pluie : fond très légèrement assombri + fines traînées de pluie presque transparentes.
   Ne reçoit aucun toucher. S'arrête si l'onglet est caché ou si le visiteur a réduit les animations. */

const HIDDEN = ["/admin", "/games", "/thewave", "/checkout", "/success", "/password", "/auth"]

export default function RainLayer() {
  const pathname = usePathname() ?? "/"
  const [on, setOn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const read = () => setOn(document.documentElement.classList.contains("rain"))
    read()
    window.addEventListener(RAIN_EVENT, read)
    return () => window.removeEventListener(RAIN_EVENT, read)
  }, [])

  const hidden = HIDDEN.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (!on || hidden) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let w = 0
    let h = 0
    let raf = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)
    const count = w < 640 ? 38 : 70
    const mk = (y?: number) => ({
      x: Math.random() * (w + 80) - 40,
      y: y ?? Math.random() * h,
      len: 10 + Math.random() * 16,
      speed: 520 + Math.random() * 420,
      a: 0.07 + Math.random() * 0.13,
    })
    const drops = Array.from({ length: count }, () => mk())
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
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [on, hidden])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[19]">
      <div
        className="absolute inset-0 transition-opacity duration-[2000ms]"
        style={{ background: "rgba(24,30,38,0.08)", opacity: on && !hidden ? 1 : 0 }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full transition-opacity duration-[2000ms]" style={{ opacity: on && !hidden ? 1 : 0 }} />
    </div>
  )
}
