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

const EASE = [0.22, 1, 0.36, 1] as const

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
  const [to, setTo] = useState<Box | null>(null)
  const [bg, setBg] = useState(false)
  const jobRef = useRef<Job | null>(null)
  jobRef.current = job

  const finish = useCallback(() => {
    document.documentElement.classList.remove("hero-running")
    ;(window as any).__heroActive = false
    setJob(null)
    setTo(null)
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
        setTo(null)
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

  // la fiche produit est affichée : on attend sa grande image, on mesure sa place
  useEffect(() => {
    if (!job || pathname !== job.path) return
    let raf = 0
    let stable = 0
    let last = ""
    const started = Date.now()
    const tick = () => {
      if (Date.now() - started > 4000) {
        finish()
        return
      }
      const el = document.querySelector("[data-hero-target]") as HTMLElement | null
      const img = el?.querySelector("img") as HTMLImageElement | null
      if (el && img && img.complete && window.scrollY < 2) {
        const r = el.getBoundingClientRect()
        const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`
        if (r.width > 0 && key === last) stable++
        else stable = 0
        last = key
        if (stable >= 3) {
          setTo({ top: r.top, left: r.left, width: r.width, height: r.height })
          return
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
        animate={{ opacity: bg && !to ? 1 : 0 }}
        transition={{ duration: to ? 0.6 : 0.35, ease: "easeOut", delay: to ? 0.35 : 0 }}
      />
      <motion.img
        src={job.src}
        alt=""
        draggable={false}
        className="pointer-events-none fixed z-[45] object-cover"
        initial={{ ...job.from, borderRadius: job.radius }}
        animate={to ? { ...to, borderRadius: 0 } : { ...job.from, borderRadius: job.radius }}
        transition={{ duration: 0.85, ease: EASE }}
        onAnimationComplete={() => {
          if (to) window.setTimeout(finish, 650)
        }}
      />
    </>
  )
}
