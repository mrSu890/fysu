"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/* Petit retour visuel quand on touche un bouton ou un lien :
   le bouton rebondit (ou le lien se souligne un instant) pour confirmer le clic.
   Désactivé dans l'admin, sur TheWave et sur l'arcade. Les styles sont dans globals.css (« RETOUR AU CLIC »). */

const TARGET = "button, a, summary, [role='button'], [data-href]"

export default function ClickFeedback() {
  const pathname = usePathname() ?? ""
  const off = pathname.startsWith("/admin") || pathname.startsWith("/thewave") || pathname.startsWith("/games")

  useEffect(() => {
    // les pages « hors ligne principale » (admin, TheWave, arcade) gardent leur style d'origine
    if (off) document.documentElement.setAttribute("data-fysu-off", "1")
    else document.documentElement.removeAttribute("data-fysu-off")
    if (off) return

    function onDown(e: PointerEvent) {
      const t = e.target as Element | null
      const el = t?.closest?.(TARGET) as HTMLElement | null
      if (!el) return
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return
      if (el.closest(".admin-root")) return

      const inline = getComputedStyle(el).display === "inline"
      el.removeAttribute("data-tap")
      // petit saut de ligne dans le temps pour relancer l'animation si on re-clique vite
      void el.offsetWidth
      el.setAttribute("data-tap", inline ? "inline" : "box")
      window.setTimeout(() => el.removeAttribute("data-tap"), 480)
    }

    document.addEventListener("pointerdown", onDown, { passive: true })
    return () => document.removeEventListener("pointerdown", onDown)
  }, [off])

  return null
}
