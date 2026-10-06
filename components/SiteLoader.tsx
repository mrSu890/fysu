"use client"

import { useEffect, useState } from "react"
import PixelGrid from "@/components/PixelGrid"
import HomeIntro, { type IntroMedia } from "@/components/HomeIntro"

const DURATION = 2800 // durée de la ligne et du pourcentage (ms)
const LOGO_DURATION = 700 // durée d'apparition du logo (ms) : rapide
const MAX_WAIT = 9000 // sécurité : on ne bloque jamais plus longtemps
const SESSION_KEY = "fysu:loader:seen" // l'écran de chargement n'apparaît qu'une fois par visite

// Le choix de zone a-t-il déjà été fait ?
const hasRegion = () =>
  typeof document !== "undefined" &&
  document.cookie.split("; ").some((row) => row.startsWith("FYSU_COUNTRY="))

// Appelé quand l'écran de chargement n'est plus visible :
// - le pop-up de choix de zone peut apparaître (si besoin)
// - cookies et notifications attendent que la zone soit choisie
const finishLoader = () => {
  ;(window as any).__loaderVisualDone = true
  window.dispatchEvent(new Event("loader-visual-done"))

  const releasePopups = () => {
    ;(window as any).__siteLoaderDone = true
    window.dispatchEvent(new Event("site-loader-done"))
  }

  if (hasRegion()) releasePopups()
  else window.addEventListener("region-done", releasePopups, { once: true })
}

// l'image du hero (déjà dans la page) : sert à l'intro de l'accueil
function findHeroMedia(): IntroMedia | null {
  const el = document.querySelector("[data-hero-image] img, [data-hero-image] video") as
    | HTMLImageElement
    | HTMLVideoElement
    | null
  if (!el) return null
  const src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src
  return src ? { src, video: el instanceof HTMLVideoElement } : null
}

export default function SiteLoader() {
  const [progress, setProgress] = useState(0)
  const [logoReveal, setLogoReveal] = useState(0)
  const [dissolving, setDissolving] = useState(false)
  const [visible, setVisible] = useState(true)
  const [ready, setReady] = useState(false)
  // « intro » = l'image du hero grandit (accueil, première arrivée) ; « classic » = logo + pourcentage
  const [mode, setMode] = useState<"classic" | "intro">("classic")
  const [media, setMedia] = useState<IntroMedia | null>(null)

  // Au démarrage : a-t-on déjà montré le chargement pendant cette visite ?
  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1"
      if (!seen) sessionStorage.setItem(SESSION_KEY, "1")
    } catch {}

    const html = document.documentElement
    const calm =
      html.classList.contains("a11y-calm") ||
      html.classList.contains("a11y-focus") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isHome = window.location.pathname === "/"

    if (seen) {
      setVisible(false)
      finishLoader()
    } else if (isHome && calm) {
      // « moins d'animations » : pas d'intro, le site s'affiche directement
      setVisible(false)
      finishLoader()
    } else if (isHome) {
      const m = findHeroMedia()
      if (m) {
        setMedia(m)
        setMode("intro")
      }
      setReady(true)
    } else {
      setReady(true)
    }
  }, [])

  // Bloque le scroll et les gestes tant que le chargement est affiché
  useEffect(() => {
    if (!visible || !ready) return

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
  }, [visible, ready])

  // Fait monter le pourcentage de 0 à 100 et dévoile le logo
  useEffect(() => {
    if (!ready || mode === "intro") return

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
        // 100 % reste affiché un court instant, puis l'écran se dissout en pixels
        window.setTimeout(() => setDissolving(true), 350)
        return
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("load", onLoad)
    }
  }, [ready, mode])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[10000] flex select-none touch-none flex-col items-center justify-center text-foreground"
      style={{ backgroundColor: dissolving ? "transparent" : "var(--background)" }}
    >
      {/* ACCUEIL, première arrivée : l'image du hero apparaît au centre puis grandit jusqu'à sa place */}
      {ready && mode === "intro" && media && (
        <HomeIntro
          media={media}
          onDone={() => {
            setVisible(false)
            finishLoader()
          }}
        />
      )}

      {ready && mode === "classic" && !dissolving && (
        <>
          {/* Logo qui se dévoile rapidement de haut en bas */}
          <div
            className="aspect-[1195/359] w-[120px] sm:w-[150px]"
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
          <div className="mt-7 h-[2px] w-[70vw] max-w-[360px] bg-foreground/15">
            <div
              className="h-full bg-foreground"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Pourcentage : style terminal */}
          <div
            className="mt-5 text-sm tracking-[0.25em] text-foreground/60 tabular-nums"
            style={{
              fontFamily:
                'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
            }}
          >
            {String(progress).padStart(3, "0")}%
          </div>
        </>
      )}

      {/* L'écran se dissout en carrés, du bas vers le haut, et laisse apparaître le site */}
      {dissolving && (
        <PixelGrid
          mode="out"
          color="var(--background)"
          onDone={() => {
            setVisible(false)
            finishLoader()
          }}
        />
      )}
    </div>
  )
}
