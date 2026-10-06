"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { TIPS, TEXT, markTipSeen, tipsOff, tipsSeen, turnTipsOff, type Tip } from "@/lib/tips"

/* ====================================================================
   ASTUCES GUIDÉES : le moteur (la liste et les textes sont dans lib/tips.ts)
   - une astuce à la fois, jamais par-dessus un pop-up ou un élément caché
   - le fond s'assombrit, l'élément reste éclairé, une flèche le montre
   - « Passer » arrête toutes les astuces
   ==================================================================== */

type Box = { left: number; top: number; width: number; height: number }

const PAD = 8
const Z = 9500 // au-dessus des pop-ups, sous l'écran de chargement
const started = typeof performance !== "undefined" ? performance.now() : 0

function findTarget(name: string): HTMLElement | null {
  const list = Array.from(document.querySelectorAll<HTMLElement>(`[data-tip="${name}"]`))
  for (const el of list) {
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) continue
    const vw = window.innerWidth
    const vh = window.innerHeight
    // entièrement dans l'écran
    if (r.left < 0 || r.top < 60 || r.right > vw || r.bottom > vh - 4) continue
    // rien ne le recouvre (écran de chargement, pop-up…)
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    if (!hit || !(el === hit || el.contains(hit) || hit.contains(el))) continue
    return el
  }
  return null
}

export default function Tips() {
  const pathname = usePathname() ?? "/"
  const locale = useLocale()
  const lang = locale === "fr" ? "fr" : "en"
  const txt = TEXT[lang]

  const [active, setActive] = useState<{ tip: Tip; step: number } | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active
  const [version, setVersion] = useState(0)

  const blockedPage = /^\/(admin|password|auth)/.test(pathname)

  // « Revoir les astuces »
  useEffect(() => {
    const onReset = () => {
      setActive(null)
      setVersion((v) => v + 1)
    }
    window.addEventListener("fysu-tips-reset", onReset)
    return () => window.removeEventListener("fysu-tips-reset", onReset)
  }, [])

  // on cherche une astuce à montrer
  useEffect(() => {
    if (blockedPage) return
    const timer = window.setInterval(() => {
      if (activeRef.current || tipsOff()) return
      const html = document.documentElement
      if (html.classList.contains("a11y-focus")) return
      const seen = tipsSeen()
      const age = performance.now() - started
      for (const tip of TIPS) {
        if (seen.includes(tip.id)) continue
        if (age < (tip.delay ?? 0)) continue
        if (!document.querySelector(tip.trigger)) continue
        if (!findTarget(tip.steps[0].target)) continue
        // un pop-up est ouvert (région, cookies, question musique…) qui ne contient pas la cible : on attend
        const target = findTarget(tip.steps[0].target)!
        const blockers = Array.from(document.querySelectorAll('[role="dialog"]'))
        if (blockers.some((b) => !b.contains(target))) continue
        markTipSeen(tip.id)
        setActive({ tip, step: 0 })
        return
      }
    }, 700)
    return () => window.clearInterval(timer)
  }, [blockedPage, version])

  // l'éclairage suit l'élément (même s'il bouge)
  useEffect(() => {
    if (!active) {
      setBox(null)
      return
    }
    let raf = 0
    let missing = 0
    const loop = () => {
      const el = document.querySelector<HTMLElement>(`[data-tip="${active.tip.steps[active.step].target}"]`)
      if (el) {
        missing = 0
        const r = el.getBoundingClientRect()
        setBox((b) =>
          b && Math.abs(b.left - r.left) < 2 && Math.abs(b.top - r.top) < 2 && Math.abs(b.width - r.width) < 2 && Math.abs(b.height - r.height) < 2
            ? b
            : { left: r.left, top: r.top, width: r.width, height: r.height }
        )
      } else if (++missing > 40) {
        // l'élément a disparu (menu refermé…) : on arrête
        setActive(null)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])

  // la page change : on ferme
  useEffect(() => {
    setActive(null)
  }, [pathname])

  if (!active || !box) return null
  const { tip, step } = active
  const s = tip.steps[step]
  const last = step === tip.steps.length - 1

  const vw = typeof window !== "undefined" ? window.innerWidth : 390
  const vh = typeof window !== "undefined" ? window.innerHeight : 800
  const cardW = Math.min(vw - 32, 320)
  const cx = box.left + box.width / 2
  // la bulle va là où il y a de la place ; si l'élément est très grand (le vinyle), elle se pose dessus
  const spaceBelow = vh - (box.top + box.height) - PAD
  const spaceAbove = box.top - PAD
  const NEED = 210
  const inside = spaceBelow < NEED && spaceAbove < NEED
  const below = spaceBelow >= NEED && (spaceBelow >= spaceAbove || spaceAbove < NEED)
  const left = Math.min(Math.max(16, cx - cardW / 2), vw - cardW - 16)
  const arrowX = Math.min(Math.max(cx - left, 24), cardW - 24)
  const gap = 18

  const next = () => {
    if (last) setActive(null)
    else setActive({ tip, step: step + 1 })
  }
  const skip = () => {
    turnTipsOff()
    setActive(null)
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0"
      style={{ zIndex: Z, touchAction: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* éclairage : un trou dans le fond sombre autour de l'élément */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: box.left - PAD,
          top: box.top - PAD,
          width: box.width + PAD * 2,
          height: box.height + PAD * 2,
          borderRadius: s.round ? 9999 : 20,
          boxShadow: "0 0 0 100vmax rgba(0,0,0,0.68), 0 0 0 2px rgba(255,255,255,0.55)",
          transition: "all 0.25s ease",
        }}
      />

      {/* bulle + flèche */}
      <div
        className="absolute text-white"
        style={{
          left,
          width: cardW,
          ...(inside
            ? { top: Math.max(16, box.top + box.height / 2 - 80) }
            : below
              ? { top: box.top + box.height + PAD + gap }
              : { bottom: vh - box.top + PAD + gap }),
        }}
      >
        {!inside && (
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute"
          style={{
            left: arrowX - 11,
            ...(below ? { top: -gap - 4, transform: "none" } : { bottom: -gap - 4, transform: "rotate(180deg)" }),
          }}
        >
          <path d="M12 20V5M6 11l6-6 6 6" />
        </svg>
        )}

        <div
          className="rounded-3xl p-5"
          style={{
            background: "rgba(24,24,24,0.92)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.12)",
          }}
        >
          <p className="font-info text-[13px] font-light leading-[1.75]">{s.text[lang]}</p>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              data-no-tap
              onClick={skip}
              className="font-info cursor-pointer text-[11px] font-light uppercase tracking-[0.2em] text-white/60 underline underline-offset-4"
            >
              {txt.skip}
            </button>

            <div className="flex items-center gap-3">
              {tip.steps.length > 1 && (
                <span className="font-info text-[11px] text-white/50">
                  {step + 1}/{tip.steps.length}
                </span>
              )}
              <button
                type="button"
                data-no-tap
                onClick={next}
                className="font-info cursor-pointer rounded-full bg-white px-5 py-2 text-[11px] font-normal uppercase tracking-[0.2em] text-black active:scale-95"
              >
                {last ? txt.ok : txt.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
