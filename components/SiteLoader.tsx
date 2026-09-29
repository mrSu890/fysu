"use client"

import { useEffect, useState } from "react"

const DURATION = 2800 // durée de la ligne et du pourcentage (ms)
const LOGO_DURATION = 700 // durée d'apparition du logo (ms) : rapide
const MAX_WAIT = 9000 // sécurité : on ne bloque jamais plus longtemps

export default function SiteLoader() {
  const [progress, setProgress] = useState(0)
  const [logoReveal, setLogoReveal] = useState(0)
  const [fading, setFading] = useState(false)
  const [visible, setVisible] = useState(true)

  // Bloque le scroll et les gestes tant que le chargement est affiché
  useEffect(() => {
    if (!visible) return

    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"

    const stop = (e: Event) => e.preventDefault()
    const stopKeys = (e: KeyboardEvent) => {
      if (
        [" ", "PageDown", "PageUp", "ArrowUp", "ArrowDown", "Home", "End"].includes(
          e.key
        )
      ) {
        e.preventDefault()
      }
    }

    window.addEventListener("touchmove", stop, { passive: false })
    window.addEventListener("wheel", stop, { passive: false })
    window.addEventListener("keydown", stopKeys)

    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
      window.removeEventListener("touchmove", stop)
      window.removeEventListener("wheel", stop)
      window.removeEventListener("keydown", stopKeys)
    }
  }, [visible])

  // Fait monter le pourcentage de 0 à 100 et dévoile le logo
  useEffect(() => {
    let raf = 0
    let loaded = document.readyState === "complete"
    let last = -1
    let lastLogo = -1
    let done = false
    const start = performance.now()

    const onLoad = () => {
      loaded = true
    }
    window.addEventListener("load", onLoad)

    const tick = (now: number) => {
      const elapsed = now - start

      // Logo : apparition rapide (ease-out)
      const lt = Math.min(elapsed / LOGO_DURATION, 1)
      const logoP = Math.floor((1 - Math.pow(1 - lt, 3)) * 100)
      if (logoP !== lastLogo) {
        lastLogo = logoP
        setLogoReveal(logoP)
      }

      // Ligne + pourcentage
      const t = Math.min(elapsed / DURATION, 1)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      let p = eased * 100
      // On attend que le site soit vraiment chargé avant d'atteindre 100 %
      if (!loaded && elapsed < MAX_WAIT) p = Math.min(p, 99)

      const rounded = Math.floor(p)
      if (rounded !== last) {
        last = rounded
        setProgress(rounded)
      }

      if (p >= 100 && !done) {
        done = true
        setProgress(100)
        setLogoReveal(100)
        setFading(true)
        window.setTimeout(() => {
          setVisible(false)
          // Prévient les notifications que le chargement est terminé
          ;(window as any).__siteLoaderDone = true
          window.dispatchEvent(new Event("site-loader-done"))
        }, 700)
        return
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("load", onLoad)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[10000] flex select-none touch-none flex-col items-center justify-center bg-background text-foreground"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.7s ease",
      }}
    >
      {/* Logo qui se dévoile rapidement de haut en bas */}
      <div
        className="aspect-[1195/359] w-[200px] sm:w-[260px]"
        style={{ clipPath: `inset(0 0 ${100 - logoReveal}% 0)` }}
      >
        <div
          className="loader-logo-lightmode h-full w-full bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/images/fysu-dark.png)" }}
        />
        <div
          className="loader-logo-darkmode h-full w-full bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/images/fysu-light.png)" }}
        />
      </div>

      {/* Ligne fine */}
      <div className="mt-16 h-[2px] w-[70vw] max-w-[360px] bg-foreground/15">
        <div
          className="h-full bg-foreground"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Pourcentage */}
      <div className="mt-8 text-sm tracking-[0.2em] text-foreground/50 tabular-nums">
        {progress}%
      </div>
    </div>
  )
}
