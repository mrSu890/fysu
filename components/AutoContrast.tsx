"use client"

import { useEffect } from "react"

/* ====================================================================
   LISIBILITÉ AUTOMATIQUE (clair sur clair / foncé sur foncé)
   Repère les textes dont la couleur est trop proche du fond derrière eux et les passe
   en noir ou en blanc, avec un fondu. Si le fond change, tout se réajuste.
   Les textes déjà lisibles ne sont jamais touchés.
   Utilisé sur les pages The Wave (fiche produit, album) dont le fond est choisi dans l'admin.
   ==================================================================== */

type RGBA = [number, number, number, number]

const MIN_CONTRAST = 3.2
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IMG", "SVG", "CANVAS", "VIDEO", "INPUT", "TEXTAREA", "SELECT", "OPTION", "PATH"])

function parseColor(value: string): RGBA | null {
  const v = value.trim()
  if (!v || v === "transparent") return [0, 0, 0, 0]
  const nums = (v.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  if (v.startsWith("rgb")) {
    if (nums.length < 3) return null
    return [nums[0], nums[1], nums[2], nums.length > 3 ? nums[3] : 1]
  }
  if (v.startsWith("color(")) {
    // color(srgb r g b / a) : valeurs de 0 à 1
    const n = nums.slice(0, 3)
    if (n.length < 3) return null
    return [n[0] * 255, n[1] * 255, n[2] * 255, nums.length > 3 ? nums[3] : 1]
  }
  return null
}

function luminance([r, g, b]: RGBA) {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: RGBA, b: RGBA) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function hexToRgba(hex: string): RGBA {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1) as RGBA
}

const BLACK: RGBA = [23, 23, 23, 1]
const WHITE: RGBA = [255, 255, 255, 1]

export default function AutoContrast({ bg }: { bg: string }) {
  useEffect(() => {
    const pageBg = hexToRgba(bg)

    const style = document.createElement("style")
    style.textContent = "[data-ac]{transition:color .35s ease,fill .35s ease}"
    document.head.appendChild(style)

    // fond réel derrière un élément : premier ancêtre opaque, sinon le fond de la page.
    // null = fond en image / dégradé : on ne touche pas.
    const backdrop = (el: Element): RGBA | null => {
      let a: Element | null = el
      while (a && a !== document.documentElement) {
        const cs = getComputedStyle(a)
        const c = parseColor(cs.backgroundColor)
        if (c && c[3] >= 0.6) return c
        if (cs.backgroundImage && cs.backgroundImage !== "none") return null
        a = a.parentElement
      }
      return pageBg
    }

    const hasOwnText = (el: Element) => {
      for (const n of Array.from(el.childNodes)) {
        if (n.nodeType === 3 && (n.textContent ?? "").trim()) return true
      }
      return false
    }

    const run = () => {
      const all = document.body.querySelectorAll<HTMLElement>("*")
      all.forEach((el) => {
        if (SKIP.has(el.tagName.toUpperCase()) || el.closest("[data-px]")) return
        if (!hasOwnText(el)) return
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return

        const bgc = backdrop(el)
        if (!bgc) return

        const overridden = el.hasAttribute("data-ac")
        const orig = overridden ? parseColor(el.dataset.acOrig ?? "") : parseColor(getComputedStyle(el).color)
        if (!orig) return
        const origCss = overridden ? (el.dataset.acOrig as string) : getComputedStyle(el).color

        // couleur d'origine avec son opacité réelle sur le fond
        const eff: RGBA =
          orig[3] < 1
            ? [
                orig[0] * orig[3] + bgc[0] * (1 - orig[3]),
                orig[1] * orig[3] + bgc[1] * (1 - orig[3]),
                orig[2] * orig[3] + bgc[2] * (1 - orig[3]),
                1,
              ]
            : orig

        if (contrast(eff, bgc) >= MIN_CONTRAST) {
          if (overridden) {
            el.style.removeProperty("color")
            el.removeAttribute("data-ac")
            delete el.dataset.acOrig
          }
          return
        }

        const best = contrast(BLACK, bgc) >= contrast(WHITE, bgc) ? BLACK : WHITE
        if (!overridden) {
          el.dataset.acOrig = origCss
          el.setAttribute("data-ac", "1")
        }
        el.style.setProperty("color", `rgb(${best[0]}, ${best[1]}, ${best[2]})`, "important")
      })
    }

    let timer: number | null = null
    const schedule = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        run()
      }, 120)
    }

    const first = window.setTimeout(run, 60)
    const second = window.setTimeout(run, 700)
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
      if (timer) window.clearTimeout(timer)
      observer.disconnect()
      document.querySelectorAll<HTMLElement>("[data-ac]").forEach((el) => {
        el.style.removeProperty("color")
        el.removeAttribute("data-ac")
        delete el.dataset.acOrig
      })
      style.remove()
    }
  }, [bg])

  return null
}
