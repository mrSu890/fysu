"use client"

import { useEffect, useRef } from "react"

/* ====================================================================
   INTRO DE L'ACCUEIL (remplace l'écran de chargement sur la page d'accueil)
   1. une petite image du hero apparaît au centre, dépliée de haut en bas
   2. elle grandit jusqu'à occuper exactement la place de l'image du hero
   3. fin : l'écran disparaît ; le logo rose et les textes arrivent (voir LogoIntro et Hero)
   Le fond suit le mode clair / sombre (var(--background)).
   ==================================================================== */

export type IntroMedia = { src: string; video: boolean }

const REVEAL = 650 // dépliage d'une image (ms)
const GROW_AT = 450 // la boîte commence à grandir (ms)
const STEP = 240 // délai entre deux images qui se superposent (ms)
const GROW = 1600 // durée minimale de la croissance jusqu'à la place du hero

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function HomeIntro({ media, onDone }: { media: IntroMedia[]; onDone: () => void }) {
  const layers = useRef<(HTMLDivElement | null)[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const box = boxRef.current
    if (!box) {
      doneRef.current()
      return
    }
    let raf = 0
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      cancelAnimationFrame(raf)
      doneRef.current()
    }

    window.scrollTo(0, 0)
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w0 = Math.max(140, Math.min(vw * 0.4, 210))
    const h0 = w0 * 1.25
    const start = { l: (vw - w0) / 2, t: (vh - h0) / 2, w: w0, h: h0 }

    const L = media.length
    const REVEAL_ALL = (L - 1) * STEP + REVEAL
    const clamp = (v: number) => Math.max(0, Math.min(1, v))
    // chaque image se déplie de haut en bas, l'une après l'autre, par-dessus la précédente
    const setLayers = (e: number) => {
      for (let k = 0; k < L; k++) {
        const el = layers.current[k]
        if (el) el.style.clipPath = `inset(0 0 ${(1 - easeOut(clamp((e - k * STEP) / REVEAL))) * 100}% 0)`
      }
    }
    const set = (r: { l: number; t: number; w: number; h: number }) => {
      box.style.left = `${r.l}px`
      box.style.top = `${r.t}px`
      box.style.width = `${r.w}px`
      box.style.height = `${r.h}px`
    }
    set(start)
    setLayers(0)
    box.style.visibility = "visible"

    // on attend que l'image soit prête (au plus 5 s) pour ne jamais montrer une image à moitié chargée
    let began = false
    const begin = () => {
      if (began) return
      began = true
      const t0 = performance.now()
      // la place finale de l'image du hero (en haut de la page, défilement à 0)
      const targetEl = document.querySelector("[data-hero-image]") as HTMLElement | null
      const tr = targetEl?.getBoundingClientRect()
      const target = tr && tr.width > 0 ? { l: tr.left, t: tr.top, w: tr.width, h: tr.height } : { l: 0, t: 0, w: vw, h: vh * 0.5 }

      // la boîte grandit sans interruption pendant que les images se superposent (comme sur le site de référence)
      const GROW_DUR = Math.max(GROW, REVEAL_ALL - GROW_AT + 500)
      const tick = (now: number) => {
        const e = now - t0
        setLayers(e)
        const g = Math.max(0, Math.min(1, (e - GROW_AT) / GROW_DUR))
        const k = easeInOut(g)
        set({
          l: start.l + (target.l - start.l) * k,
          t: start.t + (target.t - start.t) * k,
          w: start.w + (target.w - start.w) * k,
          h: start.h + (target.h - start.h) * k,
        })
        if (g >= 1 && e >= REVEAL_ALL) {
          // un dernier battement, puis l'écran disparaît (la vraie image du hero est exactement dessous)
          window.setTimeout(finish, 60)
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    // on attend que les images soient prêtes (au plus 5 s) pour ne jamais montrer une image à moitié chargée
    const safety = window.setTimeout(begin, 5000)
    const els = Array.from(box.querySelectorAll("img, video")) as (HTMLImageElement | HTMLVideoElement)[]
    let pending = els.length
    const one = () => {
      pending--
      if (pending <= 0) {
        window.clearTimeout(safety)
        begin()
      }
    }
    if (pending === 0) one()
    els.forEach((el) => {
      if (el instanceof HTMLImageElement) {
        if (el.complete && el.naturalWidth > 0) one()
        else {
          el.addEventListener("load", one, { once: true })
          el.addEventListener("error", one, { once: true })
        }
      } else {
        if (el.readyState >= 2) one()
        else {
          el.addEventListener("loadeddata", one, { once: true })
          el.addEventListener("error", one, { once: true })
        }
      }
    })

    // sécurité absolue : l'intro ne bloque jamais le site plus de 12 s
    const hard = window.setTimeout(finish, 12000)
    return () => {
      window.clearTimeout(safety)
      window.clearTimeout(hard)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={boxRef} className="fixed overflow-hidden rounded-3xl" style={{ visibility: "hidden", transform: "translateZ(0)" }}>
      {media.map((m, k) => (
        <div
          key={k}
          ref={(el) => {
            layers.current[k] = el
          }}
          className="absolute inset-0 bg-neutral-300 dark:bg-neutral-800"
        >
          {m.video ? (
            <video src={m.src} className="absolute inset-0 h-full w-full object-cover" muted autoPlay loop playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.src} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          )}
        </div>
      ))}
    </div>
  )
}
