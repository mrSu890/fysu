"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import PixelGrid, { type PixelMode } from "@/components/PixelGrid"

/* ====================================================================
   TRANSITION EN PIXELS ENTRE LES PAGES
   Au clic sur un lien : les carrés couvrent l'écran très vite, la page change
   derrière, puis les carrés disparaissent au hasard, du bas vers le haut.
   Pas d'animation depuis / vers : Kiban Collector, The Wave, FY'grances et l'admin
   (pour en ajouter d'autres : complète la liste ci-dessous).
   Désactivée avec « Moins d'animations » / mode concentration (accessibilité)
   ou si l'appareil demande moins de mouvement.
   ==================================================================== */

export const PIXEL_EXCLUDED = ["/thewave", "/admin"]

export const isPixelExcluded = (pathname: string) =>
  PIXEL_EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`))

const isCalm = () => {
  const html = document.documentElement
  return (
    html.classList.contains("a11y-calm") ||
    html.classList.contains("a11y-focus") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export default function PixelTransition() {
  const pathname = usePathname()
  const router = useRouter()

  const [phase, setPhase] = useState<"idle" | PixelMode>("idle")
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const destRef = useRef<string | null>(null)
  const prevPath = useRef(pathname)

  // 0. on compte les requêtes réseau en cours (la page attend ses données avant de se montrer)
  useEffect(() => {
    const w = window as any
    if (w.__pxFetchPatched) return
    w.__pxFetchPatched = true
    w.__pxPending = 0
    const original = window.fetch.bind(window)
    window.fetch = (...args: Parameters<typeof fetch>) => {
      w.__pxPending++
      return original(...args).finally(() => {
        w.__pxPending = Math.max(0, w.__pxPending - 1)
      })
    }
  }, [])

  // 1. clic sur un lien du site : on couvre l'écran avant de changer de page
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const target = e.target as Element | null
      if (!target?.closest) return
      // un bouton / champ dans le lien garde son propre comportement
      if (target.closest("button, [role='button'], input, select, textarea, label")) return

      const a = target.closest("a[href]") as HTMLAnchorElement | null
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return

      let url: URL
      try {
        url = new URL(a.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      if (isPixelExcluded(url.pathname) || isPixelExcluded(window.location.pathname)) return
      if (isCalm()) return
      // pas pendant l'écran de chargement du début, ni si une transition est déjà en cours
      if (!(window as any).__loaderVisualDone) return
      if (phaseRef.current !== "idle") return

      e.preventDefault()
      e.stopPropagation()
      destRef.current = url.pathname + url.search + url.hash
      setPhase("in")
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  // 2. la nouvelle page est affichée : les carrés se dissolvent
  useLayoutEffect(() => {
    if (prevPath.current === pathname) return
    const from = prevPath.current
    prevPath.current = pathname

    if (isPixelExcluded(pathname) || isPixelExcluded(from) || isCalm()) {
      setPhase("idle")
      return
    }
    if (!(window as any).__loaderVisualDone) return

    // changement de page sans clic (retour arrière, bouton qui change de page) :
    // on couvre tout de suite, avant que l'écran ne se redessine
    if (phaseRef.current === "idle") setPhase("solid")

    // on attend que la nouvelle page soit vraiment prête avant de dissoudre les carrés :
    // plus rien ne s'ajoute à l'écran, plus de chargement en cours, images du haut affichées
    const started = Date.now()
    let lastChange = started
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "childList" || m.addedNodes.length === 0) continue
        const t = m.target as Element
        if (t.closest?.("[data-px]")) continue
        lastChange = Date.now()
        return
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const imagesReady = () => {
      const imgs = Array.from(document.images)
      return imgs.every((img) => {
        const r = img.getBoundingClientRect()
        const visible = r.bottom > 0 && r.top < window.innerHeight && r.width > 0
        return !visible || img.complete
      })
    }

    const poll = window.setInterval(() => {
      const now = Date.now()
      const elapsed = now - started
      const quiet = now - lastChange > 320
      const pending = ((window as any).__pxPending ?? 0) === 0
      const skeleton = !!document.querySelector(".animate-pulse")
      const ready = elapsed > 160 && quiet && pending && !skeleton && imagesReady()
      if (ready || elapsed > 4000) {
        window.clearInterval(poll)
        observer.disconnect()
        // un dernier battement pour laisser la page se dessiner
        window.setTimeout(() => setPhase("out"), 120)
      }
    }, 80)

    return () => {
      window.clearInterval(poll)
      observer.disconnect()
    }
  }, [pathname])

  // sécurité : si la page ne change pas, le rideau ne reste jamais bloqué
  useEffect(() => {
    if (phase !== "solid") return
    const timer = window.setTimeout(() => setPhase("out"), 6000)
    return () => window.clearTimeout(timer)
  }, [phase])

  if (phase === "idle") return null

  return (
    <div data-px className="fixed inset-0" style={{ zIndex: 9000 }}>
      <PixelGrid
        mode={phase}
        onDone={() => {
          if (phase === "in") {
            setPhase("solid")
            const dest = destRef.current
            destRef.current = null
            if (dest) router.push(dest)
          } else if (phase === "out") {
            setPhase("idle")
          }
        }}
      />
    </div>
  )
}
