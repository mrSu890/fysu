"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import { MOOD_LABEL, applyMood, clearManual, currentMood, moodAt, readManual, realMinutes, saveManual, type Mood } from "@/lib/mood"

/* ====================================================================
   HEURE + MÉTÉO (en bas à droite, très discret)
   - l'heure exacte avec les secondes, police mono
   - la météo à l'endroit du visiteur (ville approximative) : soleil / lune / nuages…
   - on touche l'heure : un petit popup en liquid glass s'ouvre avec un cadran (un cercle fin).
     Le soleil est à l'heure, la lune à la minute. Faire glisser le soleil change l'ambiance du site
     (nuit, aube, jour, après-midi) sans changer l'heure affichée. Voir lib/mood.ts.
   - sans choix du visiteur, l'ambiance suit l'heure réelle (le script de app/layout.tsx l'applique
     dès l'arrivée ; ici on le refait quand l'horaire change pendant la visite)
   ==================================================================== */

type Weather = { temp: number; code: number; isDay: boolean; city: string }

const HIDDEN = ["/admin", "/games", "/thewave", "/checkout", "/success", "/password", "/auth"]

type Kind = "clear" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm"

function kindOf(code: number): Kind {
  if (code === 0 || code === 1) return "clear"
  if (code === 2) return "partly"
  if (code === 3) return "cloud"
  if (code === 45 || code === 48) return "fog"
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow"
  if (code >= 95) return "storm"
  return "cloud"
}

const two = (n: number) => String(n).padStart(2, "0")

function Icon({ kind, day }: { kind: Kind; day: boolean }) {
  const p = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const
  const sun = (
    <g>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </g>
  )
  const moon = <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  const cloud = <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.2 4.4 4.4 0 0 0 7 18z" />
  if (kind === "clear") return <svg {...p}>{day ? sun : moon}</svg>
  if (kind === "partly")
    return (
      <svg {...p}>
        {day ? (
          <g transform="translate(-3 -3) scale(0.7)">{sun}</g>
        ) : (
          <g transform="translate(-3 -3) scale(0.7)">{moon}</g>
        )}
        <g transform="translate(4 5) scale(0.75)">{cloud}</g>
      </svg>
    )
  if (kind === "cloud") return <svg {...p}>{cloud}</svg>
  if (kind === "fog") return <svg {...p}><path d="M4 9h16M3 13h18M6 17h12" /></svg>
  if (kind === "rain")
    return (
      <svg {...p}>
        <g transform="translate(0 -3)">{cloud}</g>
        <path d="M9 19.5l-1 2M13 19.5l-1 2M17 19.5l-1 2" />
      </svg>
    )
  if (kind === "snow")
    return (
      <svg {...p}>
        <g transform="translate(0 -3)">{cloud}</g>
        <path d="M9 20h.01M13 21h.01M17 20h.01" strokeWidth="2.4" />
      </svg>
    )
  return (
    <svg {...p}>
      <g transform="translate(0 -3)">{cloud}</g>
      <path d="M12.5 15l-2 3h3l-2 3" />
    </svg>
  )
}

const KIND_LABEL: Record<Kind, { fr: string; en: string }> = {
  clear: { fr: "Dégagé", en: "Clear" },
  partly: { fr: "Éclaircies", en: "Partly cloudy" },
  cloud: { fr: "Nuageux", en: "Cloudy" },
  fog: { fr: "Brouillard", en: "Fog" },
  rain: { fr: "Pluie", en: "Rain" },
  snow: { fr: "Neige", en: "Snow" },
  storm: { fr: "Orage", en: "Storm" },
}

const POPUP_TEXT = {
  fr: { title: "Ambiance", hint: "Fais glisser le soleil", real: "Heure réelle", close: "Fermer", dial: "Cadran : fais glisser le soleil pour changer l'ambiance" },
  en: { title: "Mood", hint: "Drag the sun", real: "Real time", close: "Close", dial: "Dial: drag the sun to change the mood" },
}

/* Le cadran : un cercle fin, sans chiffre ni trait. Le soleil = l'heure (un tour = 12 h), la lune = la minute.
   v = position du soleil en minutes depuis minuit (0 à 1440). On le fait glisser avec le doigt. */
const SIZE = 240
const C = SIZE / 2
const R = 92

function Dial({ v, minute, onDrag, onEnd, label }: { v: number; minute: number; onDrag: (v: number) => void; onEnd: (v: number) => void; label: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const drag = useRef<{ last: number; v: number } | null>(null)

  const angleOf = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    return (Math.atan2(dy, dx) * 180) / Math.PI + 90 // 0° = en haut
  }

  const sunDeg = ((v / 720) * 360) % 360
  const moonDeg = minute * 6
  const at = (deg: number) => {
    const a = (deg * Math.PI) / 180
    return { x: C + R * Math.sin(a), y: C - R * Math.cos(a) }
  }
  const sun = at(sunDeg)
  const moon = at(moonDeg)

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label}
      className="mx-auto block h-auto w-[78%] max-w-[240px] touch-none select-none"
      onPointerDown={(e) => {
        // on attrape le soleil (ou on le fait sauter sous le doigt si on touche le cercle)
        ref.current?.setPointerCapture(e.pointerId)
        const a = angleOf(e)
        const base = ((v / 720) * 360) % 360
        let d = a - base
        d = ((d + 540) % 360) - 180
        const nv = (((v + (d / 360) * 720) % 1440) + 1440) % 1440
        drag.current = { last: a, v: nv }
        onDrag(nv)
      }}
      onPointerMove={(e) => {
        const st = drag.current
        if (!st) return
        const a = angleOf(e)
        let d = a - st.last
        d = ((d + 540) % 360) - 180
        st.last = a
        st.v = (((st.v + (d / 360) * 720) % 1440) + 1440) % 1440
        onDrag(st.v)
      }}
      onPointerUp={() => {
        const st = drag.current
        drag.current = null
        if (st) onEnd(st.v)
      }}
      onPointerCancel={() => {
        const st = drag.current
        drag.current = null
        if (st) onEnd(st.v)
      }}
      style={{ cursor: "grab" }}
    >
      <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.75" />
      {/* lune : la minute */}
      <g transform={`translate(${moon.x} ${moon.y})`} opacity="0.9">
        <circle r="6.5" fill="var(--menu)" stroke="currentColor" strokeWidth="1" />
        <path d="M2.2 -3.6A4.2 4.2 0 1 0 2.2 3.6 3.4 3.4 0 1 1 2.2 -3.6z" fill="currentColor" />
      </g>
      {/* soleil : l'heure */}
      <g transform={`translate(${sun.x} ${sun.y})`}>
        <circle r="16" fill="transparent" />
        <circle r="7" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180
            return <line key={i} x1={Math.sin(a) * 10.5} y1={-Math.cos(a) * 10.5} x2={Math.sin(a) * 14} y2={-Math.cos(a) * 14} />
          })}
        </g>
      </g>
    </svg>
  )
}

export default function ClockWeather() {
  const pathname = usePathname() ?? "/"
  const locale = useLocale()
  const lang: "fr" | "en" = locale?.startsWith("fr") ? "fr" : "en"
  const tx = POPUP_TEXT[lang]
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [open, setOpen] = useState(false)
  // position du soleil choisie à la main (null = on suit l'heure réelle)
  const [manualV, setManualV] = useState<number | null>(null)
  const [mood, setMood] = useState<Mood>("day")
  const lastMood = useRef<Mood | null>(null)
  const manualRef = useRef<number | null>(null)
  manualRef.current = manualV

  // au démarrage : un choix déjà fait par le visiteur ?
  useEffect(() => {
    const m = readManual()
    if (m) setManualV(m.v)
    const cur = currentMood()
    lastMood.current = cur
    setMood(cur)
  }, [])

  // l'horloge (chaque seconde) + l'ambiance qui suit l'heure réelle (sauf choix du visiteur)
  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => {
      setNow(new Date())
      if (manualRef.current !== null) return
      try {
        const m = moodAt(realMinutes())
        if (m !== lastMood.current) {
          lastMood.current = m
          setMood(m)
          applyMood(m)
        }
      } catch {}
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // à chaque changement de page : on remet l'ambiance (certaines pages gardent leur propre fond)
  useEffect(() => {
    try {
      applyMood(currentMood())
    } catch {}
    setOpen(false)
  }, [pathname])

  // la météo (toutes les 15 minutes)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch("/api/collectionPages?weather=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.ok) setWeather({ temp: d.temp, code: d.code, isDay: !!d.isDay, city: d.city || "" })
        })
        .catch(() => {})
    load()
    const id = window.setInterval(load, 15 * 60 * 1000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  // Échap ferme le popup
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!now || HIDDEN.some((p) => pathname.startsWith(p))) return null

  const time = `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`
  const label = weather ? `${time}${weather.city ? `, ${weather.city}` : ""}, ${weather.temp}°C` : time
  const realV = realMinutes(now)
  const sunV = manualV ?? realV
  const minuteOfHour = now.getMinutes() + now.getSeconds() / 60

  const change = (v: number) => {
    setManualV(v)
    const m = moodAt(v)
    if (m !== lastMood.current) {
      lastMood.current = m
      setMood(m)
      applyMood(m)
    }
  }
  const endDrag = (v: number) => saveManual(v)
  const reset = () => {
    clearManual()
    setManualV(null)
    const m = moodAt(realMinutes())
    lastMood.current = m
    setMood(m)
    applyMood(m)
  }

  const dateText = now.toLocaleDateString(lang === "fr" ? "fr-BE" : "en-GB", { weekday: "long", day: "numeric", month: "long" })

  return (
    <>
      <button
        type="button"
        data-tip="clock"
        aria-label={`${label}. ${tx.dial}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="font-info fixed bottom-[calc(6px+env(safe-area-inset-bottom))] right-0 z-30 flex cursor-pointer items-center gap-1.5 px-3 py-1 text-[10px] tabular-nums tracking-[0.12em] text-foreground/45 transition-opacity hover:text-foreground/80"
      >
        {weather && (
          <>
            <Icon kind={kindOf(weather.code)} day={weather.isDay} />
            <span>{weather.temp}°</span>
            <span aria-hidden="true" className="opacity-50">·</span>
          </>
        )}
        <span>{time}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* fond invisible : un toucher en dehors ferme le popup (la page reste visible derrière) */}
            <div className="fixed inset-0 z-[8000]" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              role="dialog"
              aria-label={tx.title}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              style={{ transformOrigin: "100% 100%" }}
              className="liquid-glass fixed bottom-[calc(40px+env(safe-area-inset-bottom))] right-3 z-[8001] w-[min(92vw,340px)] rounded-[28px] p-5 text-[var(--menu)] sm:right-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-info text-[11px] font-light uppercase tracking-[0.06em] opacity-80">
                    {weather?.city || "FYSU"}
                  </p>
                  <p className="font-info mt-1 text-[11px] font-light uppercase tracking-[0.06em] opacity-60">{dateText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={tx.close}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-5">
                <Dial v={sunV} minute={minuteOfHour} onDrag={change} onEnd={endDrag} label={tx.dial} />
              </div>

              {/* l'heure affichée est toujours l'heure réelle : tourner le soleil ne la change pas */}
              <p className="font-info mt-5 text-center text-2xl font-light tabular-nums tracking-[0.04em]">{time}</p>

              <div className="font-info mt-3 flex items-center justify-center gap-2 text-[11px] font-light uppercase tracking-[0.06em] opacity-75">
                {weather && (
                  <>
                    <Icon kind={kindOf(weather.code)} day={weather.isDay} />
                    <span>{weather.temp}°C</span>
                    <span aria-hidden="true" className="opacity-50">·</span>
                    <span>{KIND_LABEL[kindOf(weather.code)][lang]}</span>
                    <span aria-hidden="true" className="opacity-50">·</span>
                  </>
                )}
                <span>{MOOD_LABEL[mood as Mood][lang]}</span>
              </div>

              <div className="font-info mt-4 flex items-center justify-between text-[10px] font-light uppercase tracking-[0.06em]">
                <span className="opacity-55">{tx.hint}</span>
                {manualV !== null && (
                  <button type="button" onClick={reset} className="cursor-pointer border-b border-current pb-px opacity-90">
                    {tx.real}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
