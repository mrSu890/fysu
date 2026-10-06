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

const REVEAL = 900 // dépliage de l'image (ms)
const HOLD = 260 // pause avant de grandir
const GROW = 1600 // croissance jusqu'à la place du hero

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function HomeIntro({ media, onDone }: { media: IntroMedia; onDone: () => void }) {
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

    const set = (r: { l: number; t: number; w: number; h: number }, reveal: number) => {
      box.style.left = `${r.l}px`
      box.style.top = `${r.t}px`
      box.style.width = `${r.w}px`
      box.style.height = `${r.h}px`
      box.style.clipPath = `inset(0 0 ${(1 - reveal) * 100}% 0)`
    }
    set(start, 0)
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

      const tick = (now: number) => {
        const e = now - t0
        if (e < REVEAL) {
          set(start, easeOut(e / REVEAL))
        } else if (e < REVEAL + HOLD) {
          set(start, 1)
        } else {
          const g = Math.min(1, (e - REVEAL - HOLD) / GROW)
          const k = easeInOut(g)
          set(
            {
              l: start.l + (target.l - start.l) * k,
              t: start.t + (target.t - start.t) * k,
              w: start.w + (target.w - start.w) * k,
              h: start.h + (target.h - start.h) * k,
            },
            1
          )
          if (g >= 1) {
            // un dernier battement, puis l'écran disparaît (la vraie image du hero est exactement dessous)
            window.setTimeout(finish, 60)
            return
          }
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const el = box.querySelector("img, video") as HTMLImageElement | HTMLVideoElement | null
    const safety = window.setTimeout(begin, 5000)
    const ready = () => {
      window.clearTimeout(safety)
      begin()
    }
    if (el instanceof HTMLImageElement) {
      if (el.complete && el.naturalWidth > 0) ready()
      else {
        el.addEventListener("load", ready, { once: true })
        el.addEventListener("error", ready, { once: true })
      }
    } else if (el instanceof HTMLVideoElement) {
      if (el.readyState >= 2) ready()
      else {
        el.addEventListener("loadeddata", ready, { once: true })
        el.addEventListener("error", ready, { once: true })
      }
    } else {
      ready()
    }

    // sécurité absolue : l'intro ne bloque jamais le site plus de 12 s
    const hard = window.setTimeout(finish, 12000)
    return () => {
      window.clearTimeout(safety)
      window.clearTimeout(hard)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={boxRef}
      className="fixed overflow-hidden bg-neutral-300 dark:bg-neutral-800"
      style={{ visibility: "hidden" }}
    >
      {media.video ? (
        <video
          src={media.src}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          autoPlay
          loop
          playsInline
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.src} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      )}
    </div>
  )
}
