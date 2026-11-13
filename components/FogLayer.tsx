"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { RAIN_EVENT } from "@/lib/rain"

/* Trace du doigt / du curseur dans la buée du mode pluie.
   La buée elle-même (voile + gouttes) est dessinée en CSS sur les éléments en verre (barre, menu, pastilles) ;
   ici on garde, pour chacun, un petit masque : là où le doigt passe, la buée disparaît, puis elle se reforme lentement. */

const HIDDEN = ["/admin", "/games", "/thewave", "/checkout", "/success", "/password", "/auth"]
const SCALE = 0.5 // le masque est petit : très léger à calculer

type State = { el: HTMLElement; c: HTMLCanvasElement; x: CanvasRenderingContext2D; w: number; h: number; url: string | null; busy: boolean; dirty: boolean; lastWipe: number; last: number }

export default function FogLayer() {
  const pathname = usePathname() ?? "/"
  const hidden = HIDDEN.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (hidden) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const html = document.documentElement
    const states = new Map<HTMLElement, State>()
    let raf = 0
    let lx = -1
    let ly = -1

    const publish = (s: State, now: number) => {
      if (s.busy || !s.dirty || now - s.last < 70) return
      s.busy = true
      s.dirty = false
      s.last = now
      s.c.toBlob((b) => {
        s.busy = false
        if (!b) return
        const u = URL.createObjectURL(b)
        const old = s.url
        s.url = u
        s.el.style.setProperty("--fog-mask", `url(${u})`)
        if (old) window.setTimeout(() => URL.revokeObjectURL(old), 400)
      })
    }

    const stateFor = (el: HTMLElement): State | null => {
      const b = el.getBoundingClientRect()
      const w = Math.max(1, Math.round(b.width * SCALE))
      const h = Math.max(1, Math.round(b.height * SCALE))
      let s = states.get(el)
      if (s && (s.w !== w || s.h !== h)) {
        reset(s)
        states.delete(el)
        s = undefined
      }
      if (!s) {
        const c = document.createElement("canvas")
        c.width = w
        c.height = h
        const x = c.getContext("2d")
        if (!x) return null
        x.fillStyle = "#000"
        x.fillRect(0, 0, w, h)
        s = { el, c, x, w, h, url: null, busy: false, dirty: false, lastWipe: 0, last: 0 }
        states.set(el, s)
      }
      return s
    }
    const reset = (s: State) => {
      s.el.style.removeProperty("--fog-mask")
      if (s.url) URL.revokeObjectURL(s.url)
      s.url = null
    }

    const wipeAt = (px: number, py: number, fx: number, fy: number) => {
      const now = performance.now()
      document.querySelectorAll<HTMLElement>(".liquid-glass").forEach((el) => {
        const b = el.getBoundingClientRect()
        const m = 22
        if (px < b.left - m || px > b.right + m || py < b.top - m || py > b.bottom + m) return
        const s = stateFor(el)
        if (!s) return
        const x = s.x
        x.globalCompositeOperation = "destination-out"
        const dist = fx < 0 ? 0 : Math.hypot(px - fx, py - fy)
        const steps = Math.max(1, Math.ceil(dist / 5))
        const r = 15 * SCALE
        for (let i = 1; i <= steps; i++) {
          const ax = fx < 0 ? px : fx + ((px - fx) * i) / steps
          const ay = fy < 0 ? py : fy + ((py - fy) * i) / steps
          const cx = (ax - b.left) * SCALE
          const cy = (ay - b.top) * SCALE
          const g = x.createRadialGradient(cx, cy, 0, cx, cy, r)
          g.addColorStop(0, "rgba(0,0,0,0.95)")
          g.addColorStop(0.6, "rgba(0,0,0,0.6)")
          g.addColorStop(1, "rgba(0,0,0,0)")
          x.fillStyle = g
          x.beginPath()
          x.arc(cx, cy, r, 0, Math.PI * 2)
          x.fill()
        }
        x.globalCompositeOperation = "source-over"
        s.dirty = true
        s.lastWipe = now
      })
    }

    // la buée se reforme ; quand tout est revenu, on retire le masque
    const tick = (now: number) => {
      states.forEach((s, el) => {
        if (!el.isConnected) {
          reset(s)
          states.delete(el)
          return
        }
        const idle = now - s.lastWipe
        if (idle > 900) {
          s.x.globalAlpha = 0.035
          s.x.fillStyle = "#000"
          s.x.fillRect(0, 0, s.w, s.h)
          s.x.globalAlpha = 1
          s.dirty = true
        }
        if (idle > 14000) {
          reset(s)
          states.delete(el)
          return
        }
        publish(s, now)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onMove = (e: PointerEvent) => {
      if (!html.classList.contains("rain")) return
      wipeAt(e.clientX, e.clientY, lx, ly)
      lx = e.clientX
      ly = e.clientY
    }
    const onTouch = (e: TouchEvent) => {
      if (!html.classList.contains("rain")) return
      const t = e.touches[0]
      if (!t) return
      wipeAt(t.clientX, t.clientY, lx, ly)
      lx = t.clientX
      ly = t.clientY
    }
    const onUp = () => {
      lx = -1
      ly = -1
    }
    const onRain = () => {
      if (!html.classList.contains("rain")) {
        states.forEach(reset)
        states.clear()
      }
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("pointerup", onUp, { passive: true })
    window.addEventListener("touchend", onUp, { passive: true })
    window.addEventListener(RAIN_EVENT, onRain)
    return () => {
      cancelAnimationFrame(raf)
      states.forEach(reset)
      states.clear()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("touchend", onUp)
      window.removeEventListener(RAIN_EVENT, onRain)
    }
  }, [hidden])

  return null
}
