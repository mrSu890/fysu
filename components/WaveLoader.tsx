"use client"

import { useEffect, useState } from "react"
import { WAVE } from "@/lib/brands"

/* ====================================================================
   ÉCRAN DE CHARGEMENT THE WAVE
   UNE vague bleue : elle monte, se cabre, s'écrase puis se retire — en boucle.
   La forme est la vague officielle (lib/brands.ts).
   ==================================================================== */

const SKY = "#dbedf5"
const SEA = "#0393d1"

const SHOW_MS = 1900 // temps d'affichage
const FADE_MS = 350 // fondu de sortie
const CYCLE_S = 2.2 // durée d'un cycle de vague

// Forme unique et fermée : le contour de la vague, prolongé très loin à gauche, à droite et en bas
// (aucun bord ni couture visible quand elle bouge).
const cut = WAVE.PATH.indexOf(" L0 1852")
const SHAPE =
  (cut > 0 ? WAVE.PATH.slice(0, cut) : WAVE.PATH) +
  " L0 1852 L-6000 1900 L-6000 7000 L6000 7000 L6000 1833Z"

export default function WaveLoader() {
  const [show, setShow] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // première visite du site : l'écran de chargement général passe déjà, pas besoin de doubler
    let seen = false
    try {
      seen = sessionStorage.getItem("fysu:loader:seen") === "1"
    } catch {}
    if (!seen) {
      setShow(false)
      return
    }

    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"

    const t1 = setTimeout(() => setFading(true), SHOW_MS)
    const t2 = setTimeout(() => {
      setShow(false)
      html.style.overflow = prev
    }, SHOW_MS + FADE_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      html.style.overflow = prev
    }
  }, [])

  if (!show) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[90] overflow-hidden"
      style={{
        background: SKY,
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: "all",
      }}
    >
      <style>{`
        @keyframes fysuSurge {
          0%   { transform: translate(-80px, 3800px) rotate(-3deg); animation-timing-function: cubic-bezier(.2,.75,.3,1); }
          40%  { transform: translate(0px, -320px) rotate(0deg); animation-timing-function: cubic-bezier(.4,0,.5,1); }
          56%  { transform: translate(40px, -140px) rotate(3deg); animation-timing-function: cubic-bezier(.55,0,.85,.55); }
          76%  { transform: translate(120px, 550px) rotate(11deg) scaleY(.88); animation-timing-function: cubic-bezier(.4,0,.7,1); }
          100% { transform: translate(200px, 3800px) rotate(16deg) scaleY(.72); }
        }
        .fysu-wave-shape { transform-origin: 150px 6000px; animation: fysuSurge ${CYCLE_S}s linear infinite; }
      `}</style>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1821 2576"
        preserveAspectRatio="xMaxYMax slice"
      >
        <path className="fysu-wave-shape" d={SHAPE} fill={SEA} />
      </svg>
    </div>
  )
}
