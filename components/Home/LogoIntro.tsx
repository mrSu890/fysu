"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"

/* ====================================================================
   INTRO DE LA PAGE D'ACCUEIL
   - À l'arrivée : la barre de navigation est cachée et le logo FYSU est tout grand, en rose.
   - Quand on défile : rien d'autre ne bouge. Seul le logo rétrécit et glisse jusqu'à la place
     du logo de la barre de navigation, en passant du rose au blanc (mode clair) ou au noir (mode sombre).
   - Une fois arrivé, la barre de navigation apparaît.
   ==================================================================== */

const PINK = "#e8b5b2" // ← la couleur du grand logo (modifiable ici)
const LOGO_MASK = "/images/fysu-light.png" // seule la forme du logo compte
const ASPECT = 359 / 1195 // hauteur / largeur de l'image du logo
const SCROLL_FACTOR = 0.6 // distance de défilement de l'intro (60 % de la hauteur d'écran)
const SIDE_MARGIN = 0.03 // marge gauche/droite du grand logo (3 % de la largeur)
const TOP_MARGIN = 20 // marge en haut du grand logo (px)

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]
const smooth = (t: number) => t * t * (3 - 2 * t)
const clamp = (v: number) => Math.min(1, Math.max(0, v))

export default function LogoIntro({ children }: { children: ReactNode }) {
  const logoRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true) // true = barre de navigation cachée

  useLayoutEffect(() => {
    const el = logoRef.current
    const spacer = spacerRef.current
    if (!el || !spacer) return
    const root = document.documentElement

    let D = 1
    let target = { x: 0, y: 0, w: 100 } // place du logo dans la barre de navigation (taille réelle du dessin)
    let raf = 0
    let lastActive = true

    const measure = () => {
      D = Math.max(1, spacer.offsetHeight)
      // la barre de navigation reste en place tant que la grande image de l'accueil est visible :
      // intro + hauteur de l'image (elle est complètement défilée après ça)
      const img = document.querySelector("[data-hero-image]") as HTMLElement | null
      root.dataset.introEnd = String(Math.round(D + (img ? img.offsetHeight : 0)))
      const box = document.querySelector("[data-nav-logo]") as HTMLElement | null
      if (box) {
        const r = box.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          // l'image est « contenue » et centrée dans la boîte
          const w = Math.min(r.width, r.height / ASPECT)
          target = { x: r.left + (r.width - w) / 2, y: r.top + (r.height - w * ASPECT) / 2, w }
        }
      }
    }

    const apply = () => {
      raf = 0
      const vw = window.innerWidth
      const y = window.scrollY
      const end = D * 0.9 // le logo est arrivé à 90 % de l'intro, la barre apparaît alors
      const p = clamp(y / end)
      const e = smooth(p)

      const w0 = vw * (1 - SIDE_MARGIN * 2)
      const x0 = vw * SIDE_MARGIN
      const y0 = TOP_MARGIN
      // taille : progression « géométrique » (plus naturelle), position : linéaire
      const w = w0 * Math.pow(target.w / w0, e)
      const x = x0 + (target.x - x0) * e
      const yy = y0 + (target.y - y0) * e

      const dark = root.classList.contains("dark")
      const c0 = hex(PINK)
      const c1: [number, number, number] = dark ? [0, 0, 0] : [255, 255, 255]
      const col = c0.map((v, i) => Math.round(v + (c1[i] - v) * e))

      el.style.left = `${x}px`
      el.style.top = `${yy}px`
      el.style.width = `${w}px`
      el.style.height = `${w * ASPECT}px`
      el.style.backgroundColor = `rgb(${col[0]},${col[1]},${col[2]})`
      el.style.visibility = "visible"
      el.style.opacity = p >= 1 ? "0" : "1"

      const isActive = p < 1
      if (isActive !== lastActive) {
        lastActive = isActive
        setActive(isActive)
      }
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const remeasure = () => {
      measure()
      schedule()
    }

    measure()
    apply()
    // la barre de navigation peut finir de se mettre en place après nous : on remesure un peu plus tard
    const t1 = setTimeout(remeasure, 150)
    const t2 = setTimeout(remeasure, 700)
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", remeasure)
    const obs = new MutationObserver(schedule)
    obs.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", remeasure)
      obs.disconnect()
      if (raf) cancelAnimationFrame(raf)
      delete root.dataset.introEnd
    }
  }, [])

  return (
    <>
      {/* tant que le logo n'est pas arrivé, la barre de navigation reste cachée (elle apparaît en fondu ensuite) */}
      {active && <style>{`.navbar-root{opacity:0 !important;pointer-events:none !important}`}</style>}

      {/* le grand logo : une forme découpée dans l'image du logo, remplie d'une couleur qui change */}
      <div
        ref={logoRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-[40] transition-opacity duration-300"
        style={{
          left: `${SIDE_MARGIN * 100}vw`,
          top: TOP_MARGIN,
          width: `${(1 - SIDE_MARGIN * 2) * 100}vw`,
          aspectRatio: `${1 / ASPECT}`,
          backgroundColor: PINK,
          WebkitMaskImage: `url(${LOGO_MASK})`,
          maskImage: `url(${LOGO_MASK})`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      />

      {/* le contenu reste collé en haut pendant l'intro, puis défile normalement */}
      <div className="relative">
        <div className="sticky top-0">{children}</div>
        <div ref={spacerRef} aria-hidden="true" style={{ height: `${SCROLL_FACTOR * 100}svh` }} />
      </div>
    </>
  )
}
