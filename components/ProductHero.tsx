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
type Back = { src: string; from: Box; slug: string; path: string; kind: "product" | "music"; crop: number; top: number }

// courbe « ressort amorti » (comme les feuilles de l'iPhone) : démarre vite, se pose sans rebond
const bezier = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  let a = t
  for (let i = 0; i < 6; i++) {
    const x = 3 * (1 - a) * (1 - a) * a * x1 + 3 * (1 - a) * a * a * x2 + a * a * a
    const dx = 3 * (1 - a) * (1 - a) * x1 + 6 * (1 - a) * a * (x2 - x1) + 3 * a * a * (1 - x2)
    if (Math.abs(dx) < 1e-6) break
    a -= (x - t) / dx
  }
  a = Math.max(0, Math.min(1, a))
  return 3 * (1 - a) * (1 - a) * a * y1 + 3 * (1 - a) * a * a * y2 + a * a * a
}
const ease = bezier(0.32, 0.72, 0, 1)

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
  const imgRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLImageElement | null>(null)
  const [bg, setBg] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const jobRef = useRef<Job | null>(null)
  const leavingRef = useRef(false)
  jobRef.current = job

  /* ---------- RETOUR : de la fiche produit à la carte (l'image repart vers sa place dans la liste) ---------- */
  const [back, setBack] = useState<Back | null>(null)
  const [backFlying, setBackFlying] = useState(false)
  const [backLeaving, setBackLeaving] = useState(false)
  const backImgRef = useRef<HTMLDivElement | null>(null)
  const backInnerRef = useRef<HTMLImageElement | null>(null)
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
        const m = pathRef.current.match(/^\/product\/([^/?#]+)/) ?? pathRef.current.match(/^\/music\/([^/?#]+)/)
        const kind: "product" | "music" = pathRef.current.startsWith("/music/") ? "music" : "product"
        if (!m || jobRef.current || backRef.current) return
        const to = window.location.pathname
        if (to.startsWith("/product/") || to.startsWith("/music/") || to.startsWith("/admin")) return
        if (isCalm() || !(window as any).__loaderVisualDone) return
        if (document.documentElement.getAttribute("data-brand")) return
        // l'image de la fiche la plus visible à l'écran (pas forcément la première : on a pu défiler)
        const slides = Array.from(document.querySelectorAll(kind === "music" ? "[data-hero-target]" : "[data-hero-slide]")) as HTMLElement[]
        let el: HTMLElement | null = null
        let bestA = 0
        for (const sl of slides) {
          const b = sl.getBoundingClientRect()
          const vw = Math.max(0, Math.min(b.right, window.innerWidth) - Math.max(b.left, 0))
          const vh = Math.max(0, Math.min(b.bottom, window.innerHeight) - Math.max(b.top, 0))
          if (vw * vh > bestA) {
            bestA = vw * vh
            el = sl
          }
        }
        const img = el?.querySelector("img") as HTMLImageElement | null
        if (!el || !img || !img.currentSrc || bestA < 4000) return
        const rr = el.getBoundingClientRect()
        const left = Math.max(rr.left, 0)
        const top = Math.max(rr.top, 0)
        const r = { top, left, width: Math.min(rr.right, window.innerWidth) - left, height: Math.min(rr.bottom, window.innerHeight) - top }
        ;(window as any).__heroActive = true
        claimPopup("hero", false, true)
        setBackLeaving(false)
        setBackFlying(false)
        setBack({ src: img.currentSrc, from: r, slug: m[1], path: to, kind, crop: parseFloat(el.dataset.heroCrop || "0") || 0, top: el.dataset.heroPos === "top" ? 1 : 0 })
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
    let scrolled = false
    let endRadius = 16
    const started = Date.now()
    const DURATION = 520
    const find = (): HTMLElement | null => {
      if (back.kind === "music") return document.querySelector(`a[href="/music/${back.slug}"] [data-hero-box]`) as HTMLElement | null
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
            // la carte n'est pas à l'écran (liste ou rangée défilée) : on la ramène au centre, puis l'image la rejoint
            const off = r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth
            if (off && !scrolled) {
              scrolled = true
              try {
                box.scrollIntoView({ block: "center", inline: "center", behavior: "instant" as ScrollBehavior })
              } catch {}
              stable = 0
              last = ""
              raf = requestAnimationFrame(tick)
              return
            }
            if (off) {
              finishBack()
              return
            }
            endRadius = parseFloat(getComputedStyle(box).borderTopLeftRadius) || 0
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
        const inner = backInnerRef.current
        if (inner) {
          // la photo de la fiche est recadrée (haut coupé, calée en haut) : on revient au cadrage de la carte en glissant
          const cr = back.crop * (1 - e)
          inner.style.top = `${-cr}%`
          inner.style.height = `${100 + cr}%`
          inner.style.objectPosition = `50% ${50 - 50 * back.top * (1 - e)}%`
        }
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
    // un nouveau toucher pendant le vol : on n'attend pas, l'image s'efface en douceur et la page répond tout de suite
    const interrupt = () => finishBack()
    window.addEventListener("pointerdown", interrupt, { passive: true })
    window.addEventListener("wheel", interrupt, { passive: true })
    return () => {
      window.removeEventListener("pointerdown", interrupt)
      window.removeEventListener("wheel", interrupt)
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
    window.setTimeout(() => {
      delete (window as any).__fysuHeroSrc
    }, 400)
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
        ;(window as any).__fysuHeroSrc = src
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

  // Le vol ne dépend plus du chargement de la page : l'image part tout de suite vers l'endroit où sera la grande photo
  // (ou vers l'emplacement réservé par l'écran de chargement), puis se cale sur la vraie photo dès qu'elle est là.
  // On suit la vraie place à chaque image affichée : l'arrivée tombe pile, sans recadrage.
  useEffect(() => {
    if (!job) return
    let raf = 0
    let stable = 0
    let last = ""
    let t0 = 0
    let flyingNow = false
    let usingPred = false
    let realSeen = false
    let doneAt = 0
    let dur = 560
    let seenAt = 0
    let startBox: Box = job.from
    let tFirst = 0
    let tCrop = 0
    let tTop = 0
    let curBox: Box = job.from
    let clipEl: HTMLElement | null = null
    let clipFor: HTMLElement | null = null
    const started = Date.now()
    window.scrollTo(0, 0)
    // emplacement prévu de la grande photo (mêmes mesures que la fiche), utilisé tant que la vraie page n'est pas là
    const predict = (): Box => {
      const vw = window.innerWidth
      if (vw < 640) {
        const w = vw * 0.88
        return { top: 108, left: 0, width: w, height: (w * 4) / 3 }
      }
      const cont = Math.min(1152, vw)
      const gap = vw >= 1024 ? 96 : 48
      const w = vw >= 768 ? (cont - gap) / 2 : cont
      return { top: 144, left: (vw - cont) / 2, width: w, height: (w * 4) / 3 }
    }
    // le plus proche parent qui découpe son contenu : la copie doit être découpée pareil, sinon elle « se recadre » à l'arrivée
    const findClip = (target: HTMLElement): HTMLElement | null => {
      let a = target.parentElement
      while (a && a !== document.body && a !== document.documentElement) {
        const cs = getComputedStyle(a)
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowY) || /(auto|scroll|hidden|clip)/.test(cs.overflowX)) return a
        a = a.parentElement
      }
      return null
    }
    const tick = () => {
      const now = performance.now()
      const elapsed = Date.now() - started
      if (elapsed > 9000) {
        finish()
        return
      }
      // l'adresse de la carte peut porter une couleur (?color=…) : on compare seulement le chemin
      const onPath = pathRef.current === job.path.split("?")[0]
      const el = onPath ? (document.querySelector("[data-hero-target]") as HTMLElement | null) : null
      let target: Box | null = null
      let real = false
      let endRadius = 0
      if (el) {
        if (!flyingNow && window.scrollY > 2) window.scrollTo(0, 0)
        const img = el.querySelector("img") as HTMLImageElement | null
        if (!seenAt) seenAt = Date.now()
        const ready = !!img && (img.complete || Date.now() - seenAt > 700)
        const r = el.getBoundingClientRect()
        const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`
        if (r.width > 0 && key === last) stable++
        else stable = 0
        last = key
        if (ready && r.width > 0 && (stable >= 2 || realSeen)) {
          real = true
          tCrop = parseFloat(el.dataset.heroCrop || "0") || 0
          tTop = el.dataset.heroPos === "top" ? 1 : 0
          target = { top: r.top, left: r.left, width: r.width, height: r.height }
          endRadius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
          if (el !== clipFor) {
            clipFor = el
            clipEl = findClip(el)
          }
        }
      }
      if (real) {
        if (!flyingNow) {
          flyingNow = true
          startBox = job.from
          t0 = now
          tFirst = now
          dur = 560
          setFlying(true)
        } else if (usingPred) {
          startBox = curBox
          t0 = now
          dur = 340
          doneAt = 0
        }
        usingPred = false
        realSeen = true
      } else if (!realSeen && elapsed > 350 && job.path.startsWith("/product/")) {
        // la page tarde : l'image grandit déjà vers sa place sans attendre (fiches produit seulement)
        target = predict()
        tCrop = 1.8
        tTop = 1
        if (!flyingNow) {
          flyingNow = true
          usingPred = true
          startBox = job.from
          t0 = now
          tFirst = now
          dur = 560
          setFlying(true)
        }
      }
      const node = imgRef.current
      if (flyingNow && node && target) {
        const p = Math.min(1, (now - t0) / dur)
        const e = ease(p)
        const f = startBox
        const top = f.top + (target.top - f.top) * e
        const left = f.left + (target.left - f.left) * e
        const width = f.width + (target.width - f.width) * e
        const height = f.height + (target.height - f.height) * e
        curBox = { top, left, width, height }
        node.style.top = `${top}px`
        node.style.left = `${left}px`
        node.style.width = `${width}px`
        node.style.height = `${height}px`
        node.style.borderRadius = `${job.radius + (endRadius - job.radius) * e}px`
        const inner = innerRef.current
        if (inner) {
          // cadrage de la photo : celui de la carte au départ, celui de la fiche (haut coupé, calée en haut) à l'arrivée
          const es = ease(Math.min(1, (now - tFirst) / 560))
          const cr = tCrop * es
          inner.style.top = `${-cr}%`
          inner.style.height = `${100 + cr}%`
          inner.style.objectPosition = `50% ${50 - 50 * tTop * es}%`
        }
        if (real && clipEl) {
          const c = clipEl.getBoundingClientRect()
          const it = Math.max(0, c.top - top) * e
          const ib = Math.max(0, top + height - c.bottom) * e
          const il = Math.max(0, c.left - left) * e
          const ir = Math.max(0, left + width - c.right) * e
          node.style.clipPath = `inset(${it}px ${ir}px ${ib}px ${il}px)`
        } else if (!real) {
          node.style.clipPath = ""
        }
        if (p >= 1 && (real || elapsed > 2500)) {
          if (!doneAt) doneAt = now
          if (now - doneAt > 250) {
            finish()
            return
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // un nouveau toucher pendant le vol : l'image s'efface en douceur, rien ne bloque
    const interrupt = () => finish()
    window.addEventListener("pointerdown", interrupt, { passive: true })
    window.addEventListener("wheel", interrupt, { passive: true })
    return () => {
      window.removeEventListener("pointerdown", interrupt)
      window.removeEventListener("wheel", interrupt)
      cancelAnimationFrame(raf)
    }
  }, [job, finish])

  // sécurité générale
  useEffect(() => {
    if (!job) return
    const t = window.setTimeout(finish, 9500)
    return () => window.clearTimeout(t)
  }, [job, finish])

  const backLayer = back ? (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[44] bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: !backFlying && !backLeaving ? 1 : 0 }}
        transition={{ duration: backFlying ? 0.35 : 0.15, ease: "easeOut", delay: backFlying ? 0.08 : 0 }}
      />
      <div
        ref={backImgRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-[45] overflow-hidden"
        style={{
          opacity: backLeaving ? 0 : 1,
          transition: "opacity 0.28s ease",
          top: back.from.top,
          left: back.from.left,
          width: back.from.width,
          height: back.from.height,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={backInnerRef}
          src={back.src}
          alt=""
          draggable={false}
          className="absolute left-0 w-full object-cover"
          style={{ top: `${-back.crop}%`, height: `${100 + back.crop}%`, objectPosition: `50% ${50 - 50 * back.top}%` }}
        />
      </div>
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
        transition={{ duration: flying ? 0.4 : 0.3, ease: "easeOut", delay: flying ? 0.28 : 0 }}
      />
      <div
        ref={imgRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-[45] overflow-hidden"
        style={{
          opacity: leaving ? 0 : 1,
          transition: "opacity 0.28s ease",
          top: job.from.top,
          left: job.from.left,
          width: job.from.width,
          height: job.from.height,
          borderRadius: job.radius,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={innerRef} src={job.src} alt="" draggable={false} className="absolute left-0 top-0 h-full w-full object-cover" />
      </div>
    </>
  )
}
