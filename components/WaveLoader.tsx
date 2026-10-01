"use client"

import { useEffect, useState } from "react"

/* ====================================================================
   ÉCRAN DE CHARGEMENT THE WAVE
   Une vague bleue qui ondule en boucle, 2 secondes maximum.
   ==================================================================== */

const SKY = "#dbedf5"
const SEA = "#0393d1"
const SEA_LIGHT = "#7cc4e6"

const SHOW_MS = 1650 // temps d'affichage
const FADE_MS = 350 // fondu de sortie (total = 2 s)

// une houle qui se répète : on la dessine sur 2 largeurs pour que le défilement soit sans coupure
function swell(offset: number, amp: number) {
  const w = 600
  let d = `M0 ${offset}`
  for (let i = 0; i < 4; i++) {
    const x = i * w
    d += ` C${x + w * 0.2} ${offset - amp}, ${x + w * 0.45} ${offset - amp * 1.1}, ${x + w * 0.62} ${offset - amp * 0.2}`
    d += ` C${x + w * 0.78} ${offset + amp * 0.7}, ${x + w * 0.9} ${offset + amp * 0.5}, ${x + w} ${offset}`
  }
  d += ` L${4 * w} 600 L0 600Z`
  return d
}

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
        @keyframes waveSlideA { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes waveSlideB { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @keyframes waveBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes waveRise { from { transform: translateY(18%); } to { transform: translateY(0); } }
      `}</style>

      <div
        className="absolute inset-x-0 bottom-0 h-[62%]"
        style={{ animation: "waveRise 0.9s cubic-bezier(.2,.7,.2,1) both" }}
      >
        {/* vague claire, derrière, dans l'autre sens */}
        <div className="absolute inset-0" style={{ animation: "waveBob 1.6s ease-in-out infinite" }}>
          <svg
            className="absolute bottom-0 left-0 h-full"
            style={{ width: "200%", animation: "waveSlideB 2.6s linear infinite" }}
            viewBox="0 0 2400 600"
            preserveAspectRatio="none"
          >
            <path d={swell(190, 70)} fill={SEA_LIGHT} />
          </svg>
        </div>

        {/* vague principale */}
        <div className="absolute inset-0" style={{ animation: "waveBob 1.3s ease-in-out infinite reverse" }}>
          <svg
            className="absolute bottom-0 left-0 h-full"
            style={{ width: "200%", animation: "waveSlideA 2.1s linear infinite" }}
            viewBox="0 0 2400 600"
            preserveAspectRatio="none"
          >
            <path d={swell(250, 90)} fill={SEA} />
          </svg>
        </div>
      </div>
    </div>
  )
}
