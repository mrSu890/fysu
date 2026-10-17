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

  // Passage clair <-> sombre en douceur : à chaque changement du mode, on active un fondu lent sur toute la page
  useEffect(() => {
    const html = document.documentElement
    let was = html.classList.contains("dark")
    let timer: ReturnType<typeof setTimeout> | null = null
    const obs = new MutationObserver(() => {
      const now = html.classList.contains("dark")
      if (now === was) return
      was = now
      html.classList.add("theme-fade")
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => html.classList.remove("theme-fade"), 1100)
    })
    obs.observe(html, { attributes: true, attributeFilter: ["class"] })
    return () => {
      obs.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [])

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
      // interrupteurs (mode sombre, options…) : aucun effet
      if (el.matches("[aria-pressed], [aria-checked], [role='switch'], [role='tab'], [data-no-tap]") || el.querySelector("input, select, textarea")) return
      if (el.closest("[data-no-tap], [role='switch'], .theme-switch, .bar-theme")) return
      // le vert n'est réservé qu'aux liens / boutons faits de texte seul (pas d'icône, d'image ni de bouton rempli)
      const plain = !el.querySelector("svg, img, video, canvas, picture") && (el.textContent ?? "").trim().length > 0
      if (plain) el.removeAttribute("data-no-green")
      else el.setAttribute("data-no-green", "")

      const fire = () => {
        const inline = getComputedStyle(el).display === "inline"
        el.removeAttribute("data-tap")
        // petit saut de ligne dans le temps pour relancer l'animation si on re-clique vite
        void el.offsetWidth
        el.setAttribute("data-tap", inline ? "inline" : "box")
        window.setTimeout(() => el.removeAttribute("data-tap"), 480)
      }

      // carte produit : pas de rebond pendant qu'on glisse (changer d'image, faire défiler) :
      // le rebond n'a lieu que pour un vrai toucher (le doigt n'a presque pas bougé)
      if (el.hasAttribute("data-href")) {
        const x0 = e.clientX
        const y0 = e.clientY
        const end = () => {
          document.removeEventListener("pointerup", up)
          document.removeEventListener("pointercancel", end)
        }
        const up = (ev: PointerEvent) => {
          end()
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) fire()
        }
        document.addEventListener("pointerup", up)
        document.addEventListener("pointercancel", end)
        return
      }

      fire()
    }

    document.addEventListener("pointerdown", onDown, { passive: true })
    return () => document.removeEventListener("pointerdown", onDown)
  }, [off])

  return null
}
