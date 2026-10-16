"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/* ====================================================================
   RETOUR EXACT
   Quand on revient (flèche retour) d'une fiche produit vers une page de rangées horizontales,
   chaque rangée se remet sur la carte où elle était. Les rangées concernées portent data-row-memory="nom".
   ==================================================================== */

const KEY = "fysu-rows:"

export default function RowMemory() {
  const pathname = usePathname()

  // mémorise la position de chaque rangée pendant qu'on la fait défiler
  useEffect(() => {
    let t: number | undefined
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement | null
      const name = el && el.getAttribute ? el.getAttribute("data-row-memory") : null
      if (!el || !name) return
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        try {
          sessionStorage.setItem(`${KEY}${window.location.pathname}:${name}`, String(Math.round(el.scrollLeft)))
        } catch {
          /* ignore */
        }
      }, 150)
    }
    // le bouton retour du navigateur ou de l'app déclenche popstate : on retient que la prochaine page est un retour
    const onPop = () => {
      ;(window as unknown as { __fysuPopped?: boolean }).__fysuPopped = true
    }
    document.addEventListener("scroll", onScroll, true)
    window.addEventListener("popstate", onPop)
    return () => {
      document.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("popstate", onPop)
      window.clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const nav = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type
    const back = (window as unknown as { __fysuPopped?: boolean }).__fysuPopped || nav === "back_forward"
    ;(window as unknown as { __fysuPopped?: boolean }).__fysuPopped = false
    if (!back) return
    let tries = 0
    const iv = window.setInterval(() => {
      tries++
      const rows = document.querySelectorAll<HTMLElement>("[data-row-memory]")
      let pending = 0
      rows.forEach((el) => {
        if (el.getAttribute("data-row-restored") === "1") return
        const name = el.getAttribute("data-row-memory")
        let saved: string | null = null
        try {
          saved = sessionStorage.getItem(`${KEY}${pathname}:${name}`)
        } catch {
          /* ignore */
        }
        const x = saved ? parseInt(saved, 10) : 0
        if (!x) {
          el.setAttribute("data-row-restored", "1")
          return
        }
        if (el.scrollWidth - el.clientWidth >= x) {
          const prev = el.style.scrollBehavior
          el.style.scrollBehavior = "auto"
          el.scrollLeft = x
          el.style.scrollBehavior = prev
          el.setAttribute("data-row-restored", "1")
        } else pending++
      })
      if (pending === 0 || tries > 30) window.clearInterval(iv)
    }, 100)
    return () => window.clearInterval(iv)
  }, [pathname])

  return null
}
