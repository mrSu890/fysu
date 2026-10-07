"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"

/* ====================================================================
   TRANSPORT DE L'IMAGE : de la carte produit à la fiche produit
   Au toucher d'une carte, l'image de la carte « se détache » : le reste de la page s'efface, puis l'image
   grandit et glisse jusqu'à sa place en haut de la fiche produit (le texte apparaît ensuite).
   - la carte appelle window.__fysuHero(boîte de l'image, chemin) ; renvoie true si l'animation a pris la main
   - la fiche produit marque sa grande image avec data-hero-target (voir ProductClient.tsx)
   - sécurités : « Moins d'animations », The Wave (qui a son eau), carte pas sur sa 1re image, écran de chargement
     du début -> on renvoie false et la navigation normale (pixels) se fait comme avant ;
     si la fiche ne répond pas au bout de 5 s, tout est nettoyé
   ==================================================================== */

type Box = { top: number; left: number; width: number; height: number }
type Job = { src: string; from: Box; path: string; radius: number }

const isCalm = () => {
  const html = document.documentElement
  return (
    html.classList.contains("a11y-calm") ||
    html.classList.contains("a11y-focus") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export default function ProductHero() {
  const router = useRouter()
  const pathname = usePathname()
  const [job, setJob] = useState<Job | null>(null)
  const [flying, setFlying] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [bg, setBg] = useState(false)
  const jobRef = useRef<Job | null>(null)
  jobRef.current = job

  const finish = useCallback(() => {
    document.documentElement.classList.remove("hero-running")
    ;(window as any).__heroActive = false
    setJob(null)
    setFlying(false)
    setBg(false)
  }, [])

  // la carte demande le transport
  useEffect(() => {
    ;(window as any).__fysuHero = (el: HTMLElement | null, path: string, src: string | null): boolean => {
      try {
        if (!el || !src || jobRef.current) return false
        if (isCalm() || !(window as any).__loaderVisualDone) return false
        const r = el.getBoundingClientRect()
        if (r.width < 40 || r.height < 40) return false
        const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
        ;(window as any).__heroActive = true
        document.documentElement.classList.add("hero-running")
        setFlying(false)
        setJob({ src, from: { top: r.top, left: r.left, width: r.width, height: r.height }, path, radius })
        requestAnimationFrame(() => setBg(true))
        router.push(path)
        return true
      } catch {
        finish()
        return false
      }
    }
    return () => {
      delete (window as any).__fysuHero
    }
  }, [router, finish])

  // la fiche produit est affichée : on attend sa grande image, puis l'image « vole » vers elle.
  // Pendant le vol, on suit la vraie place de l'image de la fiche à chaque image affichée (pas une mesure
  // prise une fois pour toutes) : si la page bouge encore un peu, l'arrivée tombe pile, sans recadrage.
  useEffect(() => {
    if (!job || pathname !== job.path) return
    let raf = 0
    let stable = 0
    let last = ""
    let t0 = 0
    let flyingNow = false
    let doneAt = 0
    const started = Date.now()
    const DURATION = 900
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)
    const live = (): { r: DOMRect; el: HTMLElement } | null => {
      const el = document.querySelector("[data-hero-target]") as HTMLElement | null
      if (!el) return null
      return { r: el.getBoundingClientRect(), el }
    }
    const tick = () => {
      const now = performance.now()
      if (Date.now() - started > 8000) {
        finish()
        return
      }
      const l = live()
      if (!flyingNow) {
        const img = l?.el.querySelector("img") as HTMLImageElement | null
        if (l && img && img.complete && window.scrollY < 2) {
          const r = l.r
          const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`
          if (r.width > 0 && key === last) stable++
          else stable = 0
          last = key
          if (stable >= 2) {
            flyingNow = true
            t0 = now
            setFlying(true)
          }
        }
        if (Date.now() - started > 4500 && !flyingNow) {
          finish()
          return
        }
      } else if (imgRef.current && l) {
        const p = Math.min(1, (now - t0) / DURATION)
        const e = ease(p)
        const f = job.from
        const t = l.r
        const el = imgRef.current
        el.style.top = `${f.top + (t.top - f.top) * e}px`
        el.style.left = `${f.left + (t.left - f.left) * e}px`
        el.style.width = `${f.width + (t.width - f.width) * e}px`
        el.style.height = `${f.height + (t.height - f.height) * e}px`
        el.style.borderRadius = `${job.radius * (1 - e)}px`
        if (p >= 1) {
          if (!doneAt) doneAt = now
          if (now - doneAt > 600) {
            finish()
            return
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [job, pathname, finish])

  // sécurité générale
  useEffect(() => {
    if (!job) return
    const t = window.setTimeout(finish, 6500)
    return () => window.clearTimeout(t)
  }, [job, finish])

  if (!job) return null

  return (
    <>
      {/* le reste de la page s'efface (le fond reprend l'écran) puis se révèle une fois l'image arrivée */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[44] bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: bg && !flying ? 1 : 0 }}
        transition={{ duration: flying ? 0.6 : 0.35, ease: "easeOut", delay: flying ? 0.45 : 0 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={job.src}
        alt=""
        draggable={false}
        className="pointer-events-none fixed z-[45] object-cover"
        style={{
          top: job.from.top,
          left: job.from.left,
          width: job.from.width,
          height: job.from.height,
          borderRadius: job.radius,
        }}
      />
    </>
  )
}
