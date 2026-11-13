"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { RAIN_EVENT } from "@/lib/rain"

/* Buée du mode pluie : une vitre embuée sur toute la page, parsemée de gouttelettes.
   Le doigt / la souris dessine dans la buée (trace claire et douce) qui se reforme lentement ;
   de temps en temps une goutte glisse et laisse un sillage. Ne reçoit aucun toucher. */

const HIDDEN = ["/admin", "/games", "/thewave", "/checkout", "/success", "/password", "/auth"]

// couleur de la buée selon l'ambiance
function fogTone(): [number, number, number, number] {
  const c = document.documentElement.classList
  if (c.contains("night")) return [150, 166, 188, 0.5]
  if (c.contains("dawn")) return [206, 216, 222, 0.42]
  if (c.contains("afternoon")) return [176, 180, 172, 0.42]
  if (c.contains("sunset")) return [212, 202, 188, 0.42]
  return [232, 236, 240, 0.42]
}

export default function FogLayer() {
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    let w = 0
    let h = 0
    let raf = 0
    let frame = 0
    // « mask » = où il reste de la buée (alpha 1 = buée, 0 = vitre claire)
    const mask = document.createElement("canvas")
    const mctx = mask.getContext("2d")!
    // « tex » = la texture de la buée (voile + gouttelettes), dessinée une seule fois
    const tex = document.createElement("canvas")
    const tctx = tex.getContext("2d")!
    let tone = fogTone()

    const buildTexture = () => {
      tone = fogTone()
      const [r, g, b, a] = tone
      tex.width = w
      tex.height = h
      tctx.clearRect(0, 0, w, h)
      // voile irrégulier : de grandes taches plus ou moins denses
      tctx.fillStyle = `rgba(${r},${g},${b},${a})`
      tctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * w
        const y = Math.random() * h
        const rad = 120 + Math.random() * 260
        const gr = tctx.createRadialGradient(x, y, 0, x, y, rad)
        const dense = Math.random() < 0.5
        gr.addColorStop(0, `rgba(${r},${g},${b},${dense ? 0.16 : 0})`)
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
        tctx.fillStyle = gr
        tctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      }
      // gouttelettes : petits anneaux sombres avec un reflet clair
      const n = Math.round((w * h) / 520)
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w
        const y = Math.random() * h
        const rad = 0.8 + Math.random() * Math.random() * 3.4
        tctx.beginPath()
        tctx.arc(x, y, rad, 0, Math.PI * 2)
        tctx.fillStyle = `rgba(20,26,32,${0.1 + Math.random() * 0.12})`
        tctx.fill()
        tctx.beginPath()
        tctx.arc(x - rad * 0.25, y - rad * 0.3, rad * 0.45, 0, Math.PI * 2)
        tctx.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.35})`
        tctx.fill()
      }
    }

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
      mask.width = w
      mask.height = h
      mctx.fillStyle = "#fff"
      mctx.fillRect(0, 0, w, h)
      buildTexture()
    }
    resize()
    window.addEventListener("resize", resize)

    // la teinte suit l'ambiance
    const mo = new MutationObserver(() => {
      const t = fogTone()
      if (t.join() !== tone.join()) buildTexture()
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    /* ---- essuyer ---- */
    let lx = -1
    let ly = -1
    const brush = Math.max(22, Math.min(34, w / 28))
    const wipeAt = (x: number, y: number) => {
      mctx.globalCompositeOperation = "destination-out"
      const steps = lx < 0 ? 1 : Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / (brush * 0.35)))
      for (let i = 1; i <= steps; i++) {
        const px = lx < 0 ? x : lx + ((x - lx) * i) / steps
        const py = ly < 0 ? y : ly + ((y - ly) * i) / steps
        const gr = mctx.createRadialGradient(px, py, 0, px, py, brush)
        gr.addColorStop(0, "rgba(0,0,0,0.9)")
        gr.addColorStop(0.55, "rgba(0,0,0,0.55)")
        gr.addColorStop(1, "rgba(0,0,0,0)")
        mctx.fillStyle = gr
        mctx.beginPath()
        mctx.arc(px, py, brush, 0, Math.PI * 2)
        mctx.fill()
      }
      mctx.globalCompositeOperation = "source-over"
      lx = x
      ly = y
    }
    const onMove = (e: PointerEvent) => wipeAt(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) wipeAt(t.clientX, t.clientY)
    }
    const onUp = () => {
      lx = -1
      ly = -1
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("pointerup", onUp, { passive: true })
    window.addEventListener("touchend", onUp, { passive: true })
    window.addEventListener("pointerleave", onUp, { passive: true })

    /* ---- gouttes qui glissent ---- */
    type Run = { x: number; y: number; r: number; v: number; life: number }
    const runs: Run[] = []
    let nextRun = 0
    const spawn = () => {
      runs.push({ x: Math.random() * w, y: Math.random() * h * 0.7, r: 2.4 + Math.random() * 2.4, v: 0, life: 1.8 + Math.random() * 2.6 })
    }

    let last = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      frame++

      // la buée se reforme doucement
      if (frame % 4 === 0) {
        mctx.globalAlpha = 0.012
        mctx.fillStyle = "#fff"
        mctx.fillRect(0, 0, w, h)
        mctx.globalAlpha = 1
      }

      // gouttes
      if (t > nextRun && runs.length < 5) {
        spawn()
        nextRun = t + 1400 + Math.random() * 2600
      }
      mctx.globalCompositeOperation = "destination-out"
      for (let i = runs.length - 1; i >= 0; i--) {
        const d = runs[i]
        d.life -= dt
        // elle hésite, puis file
        d.v = Math.min(260, d.v + (60 + Math.random() * 220) * dt)
        const ny = d.y + d.v * dt
        const nx = d.x + (Math.random() - 0.5) * 18 * dt
        mctx.strokeStyle = "rgba(0,0,0,0.85)"
        mctx.lineWidth = d.r * 1.3
        mctx.lineCap = "round"
        mctx.beginPath()
        mctx.moveTo(d.x, d.y)
        mctx.lineTo(nx, ny)
        mctx.stroke()
        d.x = nx
        d.y = ny
        if (d.life <= 0 || d.y > h + 10) runs.splice(i, 1)
      }
      mctx.globalCompositeOperation = "source-over"

      // assemblage : texture × masque, puis les gouttes visibles par-dessus
      ctx.globalCompositeOperation = "source-over"
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(tex, 0, 0)
      ctx.globalCompositeOperation = "destination-in"
      ctx.drawImage(mask, 0, 0)
      ctx.globalCompositeOperation = "source-over"
      for (const d of runs) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(20,26,32,0.22)"
        ctx.fill()
        ctx.beginPath()
        ctx.arc(d.x - d.r * 0.25, d.y - d.r * 0.3, d.r * 0.45, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255,255,255,0.7)"
        ctx.fill()
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
      mo.disconnect()
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("touchend", onUp)
      window.removeEventListener("pointerleave", onUp)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [on, hidden])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full transition-opacity duration-[2500ms]" style={{ opacity: on && !hidden ? 1 : 0 }} />
    </div>
  )
}
