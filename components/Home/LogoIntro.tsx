"use client"

import { useEffect, useRef, useState } from "react"

/* ====================================================================
   GROS LOGO FYSU ROSE (accueil)
   Posé sur la grande image de l'accueil (en haut) : il descend d'en haut
   quand il arrive à l'écran. La barre de navigation reste visible tout le temps.
   Couleur : changer PINK ci-dessous.
   ==================================================================== */

export const PINK = "#e8b5b2" // ← la couleur du grand logo (modifiable ici)
const LOGO_MASK = "/images/fysu-light.png" // seule la forme du logo compte
const ASPECT = 359 / 1195 // hauteur / largeur de l'image du logo
const SIDE_MARGIN = 0.03 // marge gauche/droite (3 % de la largeur)

export default function LogoIntro({ color = PINK }: { color?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const calm =
      document.documentElement.classList.contains("a11y-calm") ||
      document.documentElement.classList.contains("a11y-focus") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (calm || typeof IntersectionObserver === "undefined") {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-no-reveal
      className="pointer-events-none absolute z-20 overflow-hidden"
      style={{ left: `${SIDE_MARGIN * 100}vw`, top: 20, width: `${(1 - SIDE_MARGIN * 2) * 100}vw`, aspectRatio: `${1 / ASPECT}` }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: color,
          WebkitMaskImage: `url(${LOGO_MASK})`,
          maskImage: `url(${LOGO_MASK})`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          transform: shown ? "translateY(0)" : "translateY(-115%)",
          transition: shown ? "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), background-color 760ms ease" : "background-color 760ms ease",
        }}
      />
    </div>
  )
}
