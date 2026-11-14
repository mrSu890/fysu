"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useLocale } from "next-intl"

/* ====================================================================
   FLÈCHE « RETOUR »
   Petite pastille en verre sous la barre de navigation, en haut à gauche de la page
   (elle défile avec la page, elle ne gêne donc pas). Absente de la page d'accueil,
   de l'admin et des pages sans navigation.
   Si le visiteur est arrivé directement sur cette page, la flèche le ramène à l'accueil.
   ==================================================================== */

const LABEL: Record<string, string> = { fr: "Retour", en: "Back" }

const isHome = (p: string) => p === "/" || /^\/[a-z]{2}(-[A-Za-z]{2})?\/?$/.test(p)
// les pages musique et jeux ont déjà leurs propres boutons de retour
const HIDDEN = [/^\/admin/, /^\/password/, /^\/success/, /^\/auth/, /^\/music/, /^\/games/]

export default function BackButton() {
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const locale = useLocale()
  const steps = useRef(0) // nombre de pages visitées sur le site depuis l'arrivée
  const first = useRef(true)
  const popping = useRef(false)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (popping.current) {
      popping.current = false // ce changement de page vient du bouton retour : on ne le compte pas comme une page de plus
      return
    }
    steps.current += 1
  }, [pathname])

  // glisser vers la droite n'importe où (hors zones qui défilent ou se glissent déjà) = retour à la page d'avant
  useEffect(() => {
    let sx = 0, sy = 0, st = 0
    let t0: EventTarget | null = null
    let multi = false
    const blocked = (start: EventTarget | null): boolean => {
      let el = start instanceof Element ? start : null
      while (el && el !== document.body) {
        if (el.hasAttribute("data-no-swipe-back")) return true
        const tag = el.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "CANVAS" || tag === "VIDEO") return true
        const cs = getComputedStyle(el)
        if (/none|pan-y|pan-x/.test(cs.touchAction) && cs.touchAction !== "auto" && cs.touchAction !== "manipulation") return true
        if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) return true
        el = el.parentElement
      }
      return false
    }
    const down = (e: TouchEvent) => {
      multi = e.touches.length > 1
      const t = e.touches[0]
      sx = t.clientX
      sy = t.clientY
      st = Date.now()
      t0 = e.target
    }
    const up = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      const dx = t.clientX - sx
      const dy = t.clientY - sy
      if (multi || dx < 90 || Math.abs(dy) > dx * 0.55 || Date.now() - st > 900) return
      if (steps.current <= 0) return
      const h = document.documentElement
      if (h.hasAttribute("data-popup") || document.body.style.overflow === "hidden") return
      if (/^\/(admin|games)/.test(window.location.pathname)) return
      if (blocked(t0)) return
      steps.current = Math.max(0, steps.current - 1)
      popping.current = true
      router.back()
    }
    window.addEventListener("touchstart", down, { passive: true })
    window.addEventListener("touchend", up, { passive: true })
    return () => {
      window.removeEventListener("touchstart", down)
      window.removeEventListener("touchend", up)
    }
  }, [router])

  if (isHome(pathname) || HIDDEN.some((r) => r.test(pathname))) return null

  const label = LABEL[locale] ?? LABEL.en

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-back-button
      data-ink-root
      onClick={() => {
        if (steps.current > 0) {
          steps.current = Math.max(0, steps.current - 1)
          popping.current = true
          router.back()
        } else {
          router.push("/")
        }
      }}
      data-fab
      className="absolute left-3 top-[112px] z-[35] flex h-8 w-8 cursor-pointer items-center justify-center transition before:absolute before:-inset-1.5 before:content-[''] active:scale-90 sm:left-5"
      style={{ color: "var(--foreground)", opacity: 0.85, filter: "drop-shadow(0 0 2px color-mix(in srgb, var(--background) 70%, transparent))" }}
    >
      <ArrowLeft size={15} strokeWidth={1.4} />
    </button>
  )
}
