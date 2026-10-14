"use client"

import { useEffect } from "react"

/* ====================================================================
   TEXTES QUI S'ADAPTENT AU FOND, EN TEMPS RÉEL
   Pour chaque texte / icône / logo posé sur du verre (barre de navigation, menu, panneau d'achat),
   on regarde ce qui se trouve DERRIÈRE (photo, fond de page, section claire ou sombre) et on passe
   le texte en sombre ou en clair (attribut data-ink, couleurs dans globals.css).
   Le calcul se refait pendant le défilement, à l'ouverture du menu, au changement de mood…
   Pour appliquer ça à un autre panneau : lui ajouter l'attribut data-ink-root.
   Pour exclure un élément : lui ajouter data-keep-color.
   ==================================================================== */

const ROOTS = ".navbar-root .liquid-glass, [data-ink-root]"
const SKIP_AREA = ".navbar-root, [data-ink-root]"
const GRID = 16

type Grid = Float32Array | null
const imgCache = new WeakMap<HTMLImageElement, { src: string; grid: Grid }>()
const eligible = new WeakMap<Element, boolean>()
const previous = new WeakMap<Element, "dark" | "light">()

const lumOf = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

function parseColor(s: string): { l: number; a: number } | null {
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
  if (p.length < 3 || p.some((n) => Number.isNaN(n))) return null
  return { l: lumOf(p[0], p[1], p[2]), a: p.length > 3 ? p[3] : 1 }
}

function sampleGrid(el: HTMLImageElement | HTMLVideoElement): Grid {
  try {
    const c = document.createElement("canvas")
    c.width = GRID
    c.height = GRID
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(el, 0, 0, GRID, GRID)
    const d = ctx.getImageData(0, 0, GRID, GRID).data
    const out = new Float32Array(GRID * GRID)
    for (let i = 0; i < GRID * GRID; i++) out[i] = lumOf(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])
    return out
  } catch {
    return null // image d'un autre site : illisible, on suppose un fond clair
  }
}

function mediaLum(el: HTMLImageElement | HTMLVideoElement, x: number, y: number): number {
  let grid: Grid = null
  if (el instanceof HTMLImageElement) {
    if (!el.complete || !el.naturalWidth) return 0.85
    const src = el.currentSrc || el.src
    const c = imgCache.get(el)
    if (c && c.src === src) grid = c.grid
    else {
      grid = sampleGrid(el)
      imgCache.set(el, { src, grid })
    }
  } else {
    if (el.readyState < 2) return 0.5
    grid = sampleGrid(el)
  }
  if (!grid) return 0.85
  const r = el.getBoundingClientRect()
  const nw = el instanceof HTMLImageElement ? el.naturalWidth : el.videoWidth
  const nh = el instanceof HTMLImageElement ? el.naturalHeight : el.videoHeight
  let u = (x - r.left) / (r.width || 1)
  let v = (y - r.top) / (r.height || 1)
  try {
    const fit = getComputedStyle(el).objectFit
    if (fit === "cover" && nw && nh) {
      const s = Math.max(r.width / nw, r.height / nh)
      const dw = nw * s
      const dh = nh * s
      u = (x - r.left - (r.width - dw) / 2) / dw
      v = (y - r.top - (r.height - dh) / 2) / dh
    }
  } catch {
    /* ignore */
  }
  const gx = Math.min(GRID - 1, Math.max(0, Math.floor(u * GRID)))
  const gy = Math.min(GRID - 1, Math.max(0, Math.floor(v * GRID)))
  return grid[gy * GRID + gx]
}

/** luminance (0 noir … 1 blanc) de ce qui est visible derrière le point (x, y), verre exclu */
function behindLum(x: number, y: number): number {
  let rem = 1
  let sum = 0
  const stack = document.elementsFromPoint(x, y)
  for (const el of stack) {
    if (el.closest(SKIP_AREA)) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === "hidden" || cs.display === "none") continue
    const op = parseFloat(cs.opacity)
    if (op === 0) continue
    if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) {
      const a = Number.isNaN(op) ? 1 : op
      sum += rem * a * mediaLum(el, x, y)
      rem *= 1 - a
    } else {
      const col = parseColor(cs.backgroundColor)
      if (col && col.a > 0.02) {
        const a = col.a * (Number.isNaN(op) ? 1 : op)
        sum += rem * a * col.l
        rem *= 1 - a
      }
    }
    if (rem < 0.04) break
  }
  if (rem > 0) {
    const html = document.documentElement
    const bg = parseColor(getComputedStyle(document.body).backgroundColor)
    const base = bg && bg.a > 0.5 ? bg.l : html.classList.contains("dark") ? 0.13 : 0.97
    sum += rem * base
  }
  return sum
}

function isTarget(el: Element, root: Element): boolean {
  const cached = eligible.get(el)
  if (cached !== undefined) return cached
  let ok = false
  const tag = el.tagName.toLowerCase()
  if (!el.hasAttribute("data-keep-color") && !el.parentElement?.closest("svg") && !["path", "g", "circle", "line", "rect", "defs", "use", "input", "textarea", "select", "script", "style"].includes(tag)) {
    if (tag === "svg" || tag === "img") ok = true
    else {
      for (const n of Array.from(el.childNodes)) {
        if (n.nodeType === 3 && (n.textContent ?? "").trim()) {
          ok = true
          break
        }
      }
    }
  }
  // un texte posé sur un bouton ou un bloc qui a son propre fond (bouton vert, Apple Pay…) garde sa couleur
  if (ok && tag !== "svg" && tag !== "img") {
    let p: Element | null = el
    while (p && p !== root) {
      if (p.hasAttribute("data-keep-color")) {
        ok = false
        break
      }
      const col = parseColor(getComputedStyle(p).backgroundColor)
      if (col && col.a > 0.5) {
        ok = false
        break
      }
      p = p.parentElement
    }
  }
  // les traits de l'icône menu (fond = couleur du texte) suivent aussi
  if (!ok && !el.hasAttribute("data-keep-color")) {
    const cs = getComputedStyle(el)
    if (cs.backgroundColor === cs.color && parseColor(cs.backgroundColor)) ok = true
  }
  eligible.set(el, ok)
  return ok
}

function run() {
  if (document.visibilityState !== "visible") return
  const html = document.documentElement
  // sensibilité réduite : on garde la couleur d'origine du mood (clair en sombre, sombre en clair)
  // et on ne bascule que si le fond est NETTEMENT contraire (blanc franc ou noir franc)
  const darkMood = html.classList.contains("dark")
  document.querySelectorAll(ROOTS).forEach((root) => {
    const rr = root.getBoundingClientRect()
    if (rr.width === 0 || rr.height === 0 || rr.bottom < 0 || rr.top > window.innerHeight) return
    const nodes = root.querySelectorAll<HTMLElement>("*")
    nodes.forEach((el) => {
      if (!isTarget(el, root)) return
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2))
      const y = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2))
      const L = behindLum(x, y)
      const prev = previous.get(el)
      let next: "dark" | "light"
      if (darkMood) {
        // texte clair par défaut ; sombre seulement sur un fond très clair
        next = L > (prev === "dark" ? 0.72 : 0.82) ? "dark" : "light"
      } else {
        // texte sombre par défaut ; clair seulement sur un fond très sombre
        next = L < (prev === "light" ? 0.36 : 0.26) ? "light" : "dark"
      }
      if (prev !== next || el.getAttribute("data-ink") !== next) {
        previous.set(el, next)
        el.setAttribute("data-ink", next)
      }
    })
  })
}

export default function AdaptiveInk() {
  useEffect(() => {
    let last = 0
    let raf = 0
    const kick = () => {
      const now = performance.now()
      if (now - last < 90) {
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; kick() })
        return
      }
      last = now
      try {
        run()
      } catch {
        /* jamais bloquant */
      }
    }
    const iv = window.setInterval(kick, 250)
    window.addEventListener("scroll", kick, { passive: true })
    window.addEventListener("resize", kick)
    document.addEventListener("click", kick, true)
    const t = window.setTimeout(kick, 300)
    return () => {
      window.clearInterval(iv)
      window.clearTimeout(t)
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("scroll", kick)
      window.removeEventListener("resize", kick)
      document.removeEventListener("click", kick, true)
    }
  }, [])
  return null
}
