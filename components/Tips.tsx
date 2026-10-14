"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { supabaseClient } from "@/lib/supabaseClient"
import { useLocale } from "next-intl"
import { claimPopup, popupBusy, popupReady, releasePopup } from "@/lib/popups"
import { TIPS, TEXT, markTipSeen, syncTipsWithAccount, tipsOff, tipsSeen, turnTipsOff, type Tip } from "@/lib/tips"

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


// Geste guidé : un doigt fantôme glisse le long du cercle du cadran, vers la droite puis vers la gauche
function GhostSlide({ box }: { box: Box }) {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const trailRef = useRef<SVGPathElement | null>(null)
  const boxRef = useRef(box)
  boxRef.current = box

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const startDeg = (() => {
      const el = document.querySelector<HTMLElement>('[data-tip="clock-dial"]')
      const v = parseFloat(el?.getAttribute("data-sun") ?? "0")
      return Number.isFinite(v) ? v : 0
    })()
    const SPAN = 110
    const CYCLE = 5200
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
    const tick = (now: number) => {
      const b = boxRef.current
      const cx = b.left + b.width / 2
      const cy = b.top + b.height / 2
      const r = (92 / 240) * b.width
      const t = ((now - t0) % CYCLE) / CYCLE
      // 0–.10 apparition + appui · .10–.45 vers la droite · .45–.58 pause · .58–.93 retour · .93–1 relâche
      let delta = 0
      let alpha = 1
      let scale = 1
      if (t < 0.1) {
        alpha = t / 0.1
        scale = 1.25 - 0.25 * (t / 0.1)
      } else if (t < 0.45) {
        delta = SPAN * ease((t - 0.1) / 0.35)
        scale = 0.9
      } else if (t < 0.58) {
        delta = SPAN
        scale = 0.9
      } else if (t < 0.93) {
        delta = SPAN * (1 - ease((t - 0.58) / 0.35))
        scale = 0.9
      } else {
        alpha = 1 - (t - 0.93) / 0.07
        scale = 0.9 + 0.35 * ((t - 0.93) / 0.07)
      }
      const deg = startDeg + delta
      const a = (deg * Math.PI) / 180
      const x = cx + r * Math.sin(a)
      const y = cy - r * Math.cos(a)
      const dot = dotRef.current
      if (dot) {
        dot.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
        dot.style.opacity = String(alpha)
      }
      const trail = trailRef.current
      if (trail) {
        const a0 = (startDeg * Math.PI) / 180
        const x0 = cx + r * Math.sin(a0)
        const y0 = cy - r * Math.cos(a0)
        trail.setAttribute("d", delta < 0.5 ? "" : `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x} ${y}`)
        trail.style.opacity = String(alpha * 0.7)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
        <path ref={trailRef} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7" />
      </svg>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0"
        style={{
          width: 42,
          height: 42,
          marginLeft: -21,
          marginTop: -21,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.28)",
          border: "2px solid rgba(255,255,255,0.95)",
          boxShadow: "0 6px 22px rgba(0,0,0,0.35)",
          willChange: "transform, opacity",
        }}
      />
    </>
  )
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

  // on attend d'avoir comparé l'appareil et le compte avant d'afficher quoi que ce soit (3 s maximum)
  const [synced, setSynced] = useState(false)
  useEffect(() => {
    let alive = true
    const done = () => alive && setSynced(true)
    const t = window.setTimeout(done, 3000)
    syncTipsWithAccount().then(() => {
      window.clearTimeout(t)
      done()
    })
    const { data } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void syncTipsWithAccount()
    })
    return () => {
      alive = false
      window.clearTimeout(t)
      data.subscription.unsubscribe()
    }
  }, [])

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

  // astuce « sur demande » : un autre composant la réclame, on répond toujours « fini » (même si on ne l'a pas montrée)
  useEffect(() => {
    const onRequest = (e: Event) => {
      const id = (e as CustomEvent).detail as string
      const tip = TIPS.find((t) => t.id === id)
      const finish = () => window.dispatchEvent(new CustomEvent("fysu-tip-done", { detail: id }))
      window.dispatchEvent(new CustomEvent("fysu-tip-ack", { detail: id }))
      if (!tip || blockedPage || tipsOff() || tipsSeen().includes(id)) return finish()
      let tries = 0
      const poll = window.setInterval(() => {
        tries++
        const html = document.documentElement
        if (html.classList.contains("a11y-focus")) {
          window.clearInterval(poll)
          return finish()
        }
        const target = document.querySelector(tip.trigger) && findTarget(tip.steps[0].target)
        const busy = activeRef.current != null || popupBusy("tip")
        if (target && !busy && popupReady("tip", 1500) && claimPopup("tip", false)) {
          window.clearInterval(poll)
          markTipSeen(tip.id)
          setActive({ tip, step: 0 })
        } else if (tries > 20) {
          window.clearInterval(poll)
          finish()
        }
      }, 500)
    }
    window.addEventListener("fysu-tip-request", onRequest)
    return () => window.removeEventListener("fysu-tip-request", onRequest)
  }, [blockedPage])

  // quand une astuce sur demande se ferme, on prévient
  const lastManual = useRef<string | null>(null)
  useEffect(() => {
    if (active?.tip.manual) lastManual.current = active.tip.id
    else if (!active && lastManual.current) {
      const id = lastManual.current
      lastManual.current = null
      window.dispatchEvent(new CustomEvent("fysu-tip-done", { detail: id }))
    }
  }, [active])

  // on cherche une astuce à montrer
  useEffect(() => {
    if (blockedPage || !synced) return
    const timer = window.setInterval(() => {
      if (activeRef.current || tipsOff()) return
      const html = document.documentElement
      if (html.classList.contains("a11y-focus")) return
      const seen = tipsSeen()
      const age = performance.now() - started
      for (const tip of TIPS) {
        if (tip.manual) continue
        if (seen.includes(tip.id)) continue
        if (age < (tip.delay ?? 0)) continue
        if (!document.querySelector(tip.trigger)) continue
        if (!findTarget(tip.steps[0].target)) continue
        // un pop-up est ouvert (région, cookies, question musique…) qui ne contient pas la cible : on attend
        const target = findTarget(tip.steps[0].target)!
        const blockers = Array.from(document.querySelectorAll('[role="dialog"]'))
        if (blockers.some((b) => !b.contains(target))) continue
        // une astuce ne démarre que si plus rien d'autre n'est en cours
        if (!popupReady("tip", 2000) || !claimPopup("tip", false)) continue
        markTipSeen(tip.id)
        setActive({ tip, step: 0 })
        return
      }
    }, 700)
    return () => window.clearInterval(timer)
  }, [blockedPage, synced, version])

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

  // la place est libérée quand l'astuce se termine
  const isActive = active !== null
  useEffect(() => {
    if (!isActive) return
    claimPopup("tip", false, true)
    return () => releasePopup("tip")
  }, [isActive])

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

      {/* geste guidé sur le cadran */}
      {tip.id === "clock-dial" && <GhostSlide box={box} />}

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
