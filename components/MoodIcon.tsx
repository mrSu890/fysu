"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { RAIN_EVENT } from "@/lib/rain"
import { claimPopup, releasePopup, whenPopupIdle } from "@/lib/popups"
import { applyMood, moodAt, readManual, realMinutes, type Mood } from "@/lib/mood"

/* Petite icône d'ambiance dans la barre de navigation (à la place de la loupe).
   - soleil (jour + après-midi), soleil qui se couche, lune, soleil qui se lève
   - un toucher ouvre le cadran de l'horloge (ClockWeather)
   - à la toute première visite : le site montre une fois l'ambiance opposée, puis revient, pendant que l'icône pulse */

export const OPEN_CLOCK_EVENT = "fysu-open-clock"
export const SUN_EVENT = "fysu-sun"
const DEMO_KEY = "fysu-mood-demo"
// pages où le cadran n'existe pas (voir HIDDEN dans ClockWeather)
const NO_CLOCK = ["/admin", "/games", "/thewave", "/checkout", "/success", "/password", "/auth"]

type Kind = "sun" | "sunset" | "moon" | "sunrise" | "rain"

function kindAt(v: number): Kind {
  const h = (((v % 1440) + 1440) % 1440) / 60
  if (h >= 20 || h < 5) return "moon"
  if (h < 8) return "sunrise"
  if (h < 18) return "sun"
  return "sunset"
}

function Glyph({ kind }: { kind: Kind }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }
  if (kind === "rain")
    return (
      <svg {...p}>
        <path d="M7 15h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 6.2 4.4 4.4 0 0 0 7 15z" />
        <path d="M8.5 18.5l-.8 2M12.5 18.5l-.8 2M16.5 18.5l-.8 2" />
      </svg>
    )
  if (kind === "moon") return <svg {...p}><path d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2z" /></svg>
  if (kind === "sun")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
    )
  // lever / coucher : demi-soleil sur l'horizon, flèche vers le haut (lever) ou vers le bas (coucher)
  return (
    <svg {...p}>
      <path d="M6.5 17a5.5 5.5 0 0 1 11 0" />
      <path d="M2.5 17h19M5 20.5h14" />
      <path d="M12 3v5M12 3l-2 2M12 3l2 2" transform={kind === "sunset" ? "rotate(180 12 5.5)" : undefined} />
      <path d="M4.6 10.6l1.2 1.2M19.4 10.6l-1.2 1.2" />
    </svg>
  )
}

export default function MoodIcon({ label }: { label: string }) {
  const pathname = usePathname() ?? "/"
  const [v, setV] = useState<number | null>(null)
  const [pulse, setPulse] = useState(0)
  const [rain, setRain] = useState(false)
  useEffect(() => {
    const read = () => setRain(document.documentElement.classList.contains("rain"))
    read()
    window.addEventListener(RAIN_EVENT, read)
    return () => window.removeEventListener(RAIN_EVENT, read)
  }, [])

  useEffect(() => {
    const read = () => setV(readManual()?.v ?? realMinutes())
    read()
    const id = window.setInterval(() => {
      if (!readManual()) read()
    }, 30000)
    const onSun = (e: Event) => setV(Number((e as CustomEvent).detail))
    window.addEventListener(SUN_EVENT, onSun)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(SUN_EVENT, onSun)
    }
  }, [])

  // démonstration unique (première visite)
  useEffect(() => {
    if (NO_CLOCK.some((p) => pathname.startsWith(p)) || pathname.startsWith("/kiban-collector")) return
    let seen = false
    try {
      seen = !!localStorage.getItem(DEMO_KEY)
    } catch {}
    if (seen || readManual()) return
    let t2: number | undefined
    let cancelIdle: (() => void) | undefined
    const run = () => {
      if (document.visibilityState !== "visible" || readManual()) {
        releasePopup("mood")
        return
      }
      try {
        localStorage.setItem(DEMO_KEY, "1")
      } catch {}
      const cur: Mood = moodAt(realMinutes())
      const other: Mood = cur === "night" || cur === "sunset" ? "day" : "night"
      setPulse((n) => n + 1)
      applyMood(other)
      setV(other === "day" ? 12 * 60 : 23 * 60)
      t2 = window.setTimeout(() => {
        releasePopup("mood")
        if (readManual()) return
        applyMood(moodAt(realMinutes()))
        setV(realMinutes())
        setPulse((n) => n + 1)
      }, 2600)
    }
    // la démonstration n'a lieu que lorsque plus rien n'est en cours (ni pop-up, ni astuce, ni panneau ouvert)
    const t1 = window.setTimeout(() => {
      cancelIdle = whenPopupIdle("mood", run, { quiet: 3000, hideFabs: false })
    }, 11000)
    return () => {
      window.clearTimeout(t1)
      if (cancelIdle) cancelIdle()
      // si on quitte la page en pleine démonstration, ClockWeather remet l'ambiance réelle
      if (t2 !== undefined) window.clearTimeout(t2)
      releasePopup("mood")
    }
  }, [pathname])

  if (v === null || NO_CLOCK.some((p) => pathname.startsWith(p))) return null

  return (
    <motion.button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CLOCK_EVENT))}
      aria-label={label}
      title={label}
      data-tip="clock"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
    >
      <motion.span
        key={pulse}
        initial={pulse ? { scale: 1 } : false}
        animate={pulse ? { scale: [1, 1.35, 1] } : undefined}
        transition={{ duration: 1.1, ease: "easeInOut" }}
        className="flex"
      >
        <Glyph kind={rain ? "rain" : kindAt(v)} />
      </motion.span>
    </motion.button>
  )
}
