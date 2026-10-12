"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

/* ====================================================================
   RETOUR SANS PERTE DE PLACE
   Quand on ouvre un produit puis qu'on revient (flèche retour), la page retrouve sa position
   et ses filtres. (Les pages se chargent après coup : le navigateur seul ne sait pas le faire.)
   ==================================================================== */

let backNav = false
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    backNav = true
    window.setTimeout(() => {
      backNav = false
    }, 4000)
  })
}

const posKey = (p: string) => `fysu-scroll:${p}`

// ready = true quand le contenu de la page est affiché
export function useScrollRestore(ready: boolean) {
  const pathname = usePathname() ?? ""
  const done = useRef(false)

  // on note la position pendant qu'on fait défiler, et au moment du toucher (avant de quitter la page)
  useEffect(() => {
    const key = posKey(pathname)
    let timer: number | undefined
    const save = () => {
      try {
        sessionStorage.setItem(key, String(Math.round(window.scrollY)))
      } catch {}
    }
    const onScroll = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(save, 150)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pointerdown", save, true)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pointerdown", save, true)
      window.clearTimeout(timer)
    }
  }, [pathname])

  // au retour : on remet la page là où elle était
  useEffect(() => {
    if (!ready || done.current) return
    done.current = true
    if (!backNav) return
    let y = 0
    try {
      y = Number(sessionStorage.getItem(posKey(pathname)) || 0)
    } catch {}
    if (y > 0) {
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
    }
  }, [ready, pathname])
}

// les filtres choisis sont gardés pendant la visite
export function usePersistedFilters<T extends object>(initial: T): [T, (f: T) => void] {
  const pathname = usePathname() ?? ""
  const key = `fysu-filters:${pathname}`
  const [filters, setFilters] = useState<T>(initial)
  const loaded = useRef(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) setFilters({ ...initial, ...JSON.parse(raw) })
    } catch {}
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!loaded.current) return
    try {
      sessionStorage.setItem(key, JSON.stringify(filters))
    } catch {}
  }, [filters, key])

  return [filters, setFilters]
}
