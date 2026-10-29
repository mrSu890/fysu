"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { claimPopup, releasePopup } from "@/lib/popups"

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
type Back = { src: string; from: Box; slug: string; path: string }

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
  const [leaving, setLeaving] = useState(false)
  const jobRef = useRef<Job | null>(null)
  const leavingRef = useRef(false)
  jobRef.current = job

  /* ---------- RETOUR : de la fiche produit à la carte (l'image repart vers sa place dans la liste) ---------- */
  const [back, setBack] = useState<Back | null>(null)
  const [backFlying, setBackFlying] = useState(false)
  const [backLeaving, setBackLeaving] = useState(false)
  const backImgRef = useRef<HTMLImageElement | null>(null)
  const backRef = useRef<Back | null>(null)
  backRef.current = back
  const pathRef = useRef(pathname)
  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  const finishBack = useCallback(() => {
    ;(window as any).__heroActive = false
    releasePopup("hero")
    setBackLeaving(true)
    window.setTimeout(() => {
      setBack(null)
      setBackFlying(false)
      setBackLeaving(false)
    }, 280)
  }, [])

  // retour arrière (bouton, geste du bord de l'écran) depuis une fiche : on capte la grande image avant que la page change
  useEffect(() => {
    const onPop = () => {
      try {
        const m = pathRef.current.match(/^\/product\/([^/?#]+)/)
        if (!m || jobRef.current || backRef.current) return
        const to = window.location.pathname
        if (to.startsWith("/product/") || to.startsWith("/admin")) return
        if (isCalm() || !(window as any).__loaderVisualDone) return
        if (document.documentElement.getAttribute("data-brand")) return
        const el = document.querySelector("[data-hero-target]") as HTMLElement | null
        const img = el?.querySelector("img") as HTMLImageElement | null
        if (!el || !img || !img.currentSrc) return
        const r = el.getBoundingClientRect()
        if (r.width < 40 || r.height < 40 || r.bottom <= 0 || r.top >= window.innerHeight) return
        ;(window as any).__heroActive = true
        claimPopup("hero", false, true)
        setBackLeaving(false)
        setBackFlying(false)
        setBack({ src: img.currentSrc, from: { top: r.top, left: r.left, width: r.width, height: r.height }, slug: m[1], path: to })
      } catch {}
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  // la liste est affichée : on retrouve la carte, puis l'image glisse jusqu'à elle
  useEffect(() => {
    if (!back || pathname !== back.path) return
    let raf = 0
    let flyingNow = false
    let t0 = 0
    let last = ""
    let stable = 0
    let doneAt = 0
    let box: HTMLElement | null = null
    let endRadius = 16
    const started = Date.now()
    const DURATION = 800
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)
    const find = (): HTMLElement | null => {
      const want = `/product/${back.slug}`
      const cards = Array.from(document.querySelectorAll("[data-href]")) as HTMLElement[]
      for (const c of cards) {
        const h = c.getAttribute("data-href") ?? ""
        if (h === want || h.startsWith(`${want}?`)) {
          const b = c.querySelector("[data-card-box]") as HTMLElement | null
          if (b) return b
        }
      }
      return null
    }
    const restore = () => {
      if (box) box.style.opacity = ""
    }
    const tick = () => {
      const now = performance.now()
      if (Date.now() - started > 3000 && !flyingNow) {
        finishBack()
        return
      }
      if (!flyingNow) {
        box = find()
        if (box) {
          const r = box.getBoundingClientRect()
          const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`
          if (r.width > 0 && key === last) stable++
          else stable = 0
          last = key
          if (stable >= 4) {
            // la carte n'est pas à l'écran (défilement perdu…) : simple fondu
            if (r.bottom <= 0 || r.top >= window.innerHeight) {
              finishBack()
              return
            }
            endRadius = parseFloat(getComputedStyle(box).borderTopLeftRadius) || 16
            box.style.opacity = "0"
            flyingNow = true
            t0 = now
            setBackFlying(true)
          }
        }
      } else if (backImgRef.current && box) {
        const p = Math.min(1, (now - t0) / DURATION)
        const e = ease(p)
        const f = back.from
        const t = box.getBoundingClientRect()
        const el = backImgRef.current
        el.style.top = `${f.top + (t.top - f.top) * e}px`
        el.style.left = `${f.left + (t.left - f.left) * e}px`
        el.style.width = `${f.width + (t.width - f.width) * e}px`
        el.style.height = `${f.height + (t.height - f.height) * e}px`
        el.style.borderRadius = `${endRadius * e}px`
        if (p >= 1) {
          if (!doneAt) {
            doneAt = now
            box.style.opacity = ""
          }
          if (now - doneAt > 120) {
            finishBack()
            return
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      restore()
    }
  }, [back, pathname, finishBack])

  // sécurité
  useEffect(() => {
    if (!back) return
    const t = window.setTimeout(finishBack, 6000)
    return () => window.clearTimeout(t)
  }, [back, finishBack])

  // fin nette : l'image copiée s'efface en douceur (jamais de disparition brutale)
  const finish = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    document.documentElement.classList.remove("hero-running")
    ;(window as any).__heroActive = false
    releasePopup("hero")
    setLeaving(true)
    window.setTimeout(() => {
      setJob(null)
      setFlying(false)
      setBg(false)
      setLeaving(false)
      leavingRef.current = false
    }, 280)
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
        claimPopup("hero", false, true)
        document.documentElement.classList.add("hero-running")
        setLeaving(false)
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
    let clipEl: HTMLElement | null | undefined
    const started = Date.now()
    const DURATION = 900
    // la fiche s'ouvre toujours tout en haut (sinon l'animation attendait un défilement qui ne vient jamais)
    if (window.scrollY > 0) window.scrollTo(0, 0)
    let seenAt = 0
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)
    // le plus proche parent qui découpe son contenu (zone de défilement de la fiche sur téléphone, par exemple) :
    // la vraie image y est coupée, donc la copie doit l'être aussi, sinon elle « se recadre » d'un coup à l'arrivée
    const findClip = (target: HTMLElement): HTMLElement | null => {
      let a = target.parentElement
      while (a && a !== document.body && a !== document.documentElement) {
        const cs = getComputedStyle(a)
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowY) || /(auto|scroll|hidden|clip)/.test(cs.overflowX)) return a
        a = a.parentElement
      }
      return null
    }
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
        if (l && !seenAt) seenAt = Date.now()
        // on n'attend pas indéfiniment le chargement de l'image : au bout de 700 ms elle est simplement posée par-dessus
        const imgReady = !!img && (img.complete || Date.now() - seenAt > 700)
        if (window.scrollY > 2) window.scrollTo(0, 0)
        if (l && img && imgReady) {
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
        if (Date.now() - started > 3200 && !flyingNow) {
          finish()
          return
        }
      } else if (imgRef.current && l) {
        const p = Math.min(1, (now - t0) / DURATION)
        const e = ease(p)
        const f = job.from
        const t = l.r
        const el = imgRef.current
        if (clipEl === undefined) clipEl = findClip(l.el)
        const top = f.top + (t.top - f.top) * e
        const left = f.left + (t.left - f.left) * e
        const width = f.width + (t.width - f.width) * e
        const height = f.height + (t.height - f.height) * e
        // arrondi : celui de la carte au départ, celui de l'image de la fiche à l'arrivée
        const endRadius = parseFloat(getComputedStyle(l.el).borderTopLeftRadius) || 0
        el.style.top = `${top}px`
        el.style.left = `${left}px`
        el.style.width = `${width}px`
        el.style.height = `${height}px`
        el.style.borderRadius = `${job.radius + (endRadius - job.radius) * e}px`
        if (clipEl) {
          const c = clipEl.getBoundingClientRect()
          const it = Math.max(0, c.top - top) * e
          const ib = Math.max(0, top + height - c.bottom) * e
          const il = Math.max(0, c.left - left) * e
          const ir = Math.max(0, left + width - c.right) * e
          el.style.clipPath = `inset(${it}px ${ir}px ${ib}px ${il}px)`
        }
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

  const backLayer = back ? (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[44] bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: !backFlying && !backLeaving ? 1 : 0 }}
        transition={{ duration: backFlying ? 0.45 : 0.15, ease: "easeOut", delay: backFlying ? 0.12 : 0 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={backImgRef}
        src={back.src}
        alt=""
        draggable={false}
        className="pointer-events-none fixed z-[45] object-cover"
        style={{
          opacity: backLeaving ? 0 : 1,
          transition: "opacity 0.28s ease",
          top: back.from.top,
          left: back.from.left,
          width: back.from.width,
          height: back.from.height,
        }}
      />
    </>
  ) : null

  if (!job) return backLayer

  return (
    <>
      {backLayer}
      {/* le reste de la page s'efface (le fond reprend l'écran) puis se révèle une fois l'image arrivée */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[44] bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: bg && !flying && !leaving ? 1 : 0 }}
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
          opacity: leaving ? 0 : 1,
          transition: "opacity 0.28s ease",
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
